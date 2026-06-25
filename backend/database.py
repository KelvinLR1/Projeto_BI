import pandas as pd
import numpy as np
from sqlalchemy import create_engine, text, inspect
import os
import time
import functools
import logging
import json
from datetime import datetime
from dotenv import load_dotenv

load_dotenv()

# Configuração do Logger
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("HubBI")

SCRIPTS_FILE = os.path.join(os.path.dirname(__file__), "data", "scripts.json")
SETTINGS_FILE = os.path.join(os.path.dirname(__file__), "data", "settings.json")
LIBRARY_FILE = os.path.join(os.path.dirname(__file__), "data", "library.json")

def log_performance(func):
    @functools.wraps(func)
    def wrapper(*args, **kwargs):
        start = time.perf_counter()
        try:
            result = func(*args, **kwargs)
            duration = time.perf_counter() - start
            logger.info(f"Executado {func.__name__} em {duration:.4f}s")
            return result
        except Exception as e:
            logger.error(f"Erro em {func.__name__}: {str(e)}")
            raise e
    return wrapper

class Config:
    DB_TYPE = os.getenv("DB_TYPE", "sqlserver")
    DB_HOST = os.getenv("DB_HOST", "localhost")
    DB_NAME = os.getenv("DB_NAME", "HubBIDB")
    DB_USER = os.getenv("DB_USER", "sa")
    DB_PASS = os.getenv("DB_PASS", "YourStrongPassword")
    DB_TRUSTED = os.getenv("DB_TRUSTED_CONNECTION", "False").lower() == "true"
    @staticmethod
    def get_app_mode():
        return SettingsManager.get().get("system_mode", "DEMO")

    @classmethod
    def get_db_url(cls):
        if cls.DB_TRUSTED:
            return f"mssql+pyodbc://@{cls.DB_HOST}/{cls.DB_NAME}?driver=ODBC+Driver+17+for+SQL+Server&trusted_connection=yes"
        return f"mssql+pyodbc://{cls.DB_USER}:{cls.DB_PASS}@{cls.DB_HOST}/{cls.DB_NAME}?driver=ODBC+Driver+17+for+SQL+Server"

class ScriptManager:
    @staticmethod
    def get_all():
        if not os.path.exists(SCRIPTS_FILE):
            return []
        with open(SCRIPTS_FILE, "r", encoding="utf-8") as f:
            return json.load(f)

    @staticmethod
    def save(name, query, description="", group="Geral", subgroup="Geral", show_in_reports=True):
        scripts = ScriptManager.get_all()
        new_script = {
            "id": str(len(scripts) + 1),
            "name": name,
            "query": query,
            "description": description,
            "group": group,
            "subgroup": subgroup,
            "show_in_reports": show_in_reports,
            "created_at": datetime.now().isoformat()
        }
        scripts.append(new_script)
        os.makedirs(os.path.dirname(SCRIPTS_FILE), exist_ok=True)
        with open(SCRIPTS_FILE, "w", encoding="utf-8") as f:
            json.dump(scripts, f, indent=4)
        return new_script

LAYOUTS_FILE = os.path.join(os.path.dirname(__file__), "data", "layouts.json")

class LayoutManager:
    @staticmethod
    def get(page: str):
        if not os.path.exists(LAYOUTS_FILE):
            return {"cards": [], "charts": [], "components": []}
        with open(LAYOUTS_FILE, "r", encoding="utf-8") as f:
            data = json.load(f)
            return data.get(page, {"cards": [], "charts": [], "components": []})

    @staticmethod
    def save(page: str, config: dict):
        if not os.path.exists(LAYOUTS_FILE):
            data = {"home": {"cards": [], "charts": [], "components": []}, "noc": {"cards": [], "charts": [], "components": []}}
        else:
            with open(LAYOUTS_FILE, "r", encoding="utf-8") as f:
                data = json.load(f)
        
        data[page] = config
        with open(LAYOUTS_FILE, "w", encoding="utf-8") as f:
            json.dump(data, f, indent=4)
        return True

class SettingsManager:
    @staticmethod
    def get():
        if not os.path.exists(SETTINGS_FILE):
            return {"accent_color": "#ff2d55", "refresh_interval": 30, "system_mode": "DEMO"}
        with open(SETTINGS_FILE, "r", encoding="utf-8") as f:
            return json.load(f)

    @staticmethod
    def save(settings: dict):
        with open(SETTINGS_FILE, "w", encoding="utf-8") as f:
            json.dump(settings, f, indent=4)
        return True

class AssetLibraryManager:
    @staticmethod
    def get_all():
        if not os.path.exists(LIBRARY_FILE):
            return []
        with open(LIBRARY_FILE, "r", encoding="utf-8") as f:
            return json.load(f)

    @staticmethod
    def save(asset: dict):
        assets = AssetLibraryManager.get_all()
        # Se já existe (pelo ID), atualiza, senão adiciona
        idx = next((i for i, a in enumerate(assets) if a.get("id") == asset.get("id")), -1)
        if idx != -1:
            assets[idx] = asset
        else:
            assets.append(asset)
        
        os.makedirs(os.path.dirname(LIBRARY_FILE), exist_ok=True)
        with open(LIBRARY_FILE, "w", encoding="utf-8") as f:
            json.dump(assets, f, indent=4)
        return True

    @staticmethod
    def delete(asset_id: str):
        assets = AssetLibraryManager.get_all()
        assets = [a for a in assets if a.get("id") != asset_id]
        with open(LIBRARY_FILE, "w", encoding="utf-8") as f:
            json.dump(assets, f, indent=4)
        return True

class DataManager:
    @staticmethod
    def get_schema():
        if Config.get_app_mode() == "DEMO":
            return {
                "db_type": Config.DB_TYPE,
                "app_mode": "DEMO",
                "tables": {
                    "Sales_Detailed": ["id", "date", "value", "revenue", "sales", "churn", "faturamento", "region"],
                    "Inventory": ["id", "product_name", "stock_level", "warehouse_location", "last_restock"],
                    "Customers": ["id", "name", "email", "country", "status", "signup_date"]
                }
            }
        
        try:
            engine = create_engine(Config.get_db_url())
            inspector = inspect(engine)
            schema = {
                "db_type": Config.DB_TYPE,
                "app_mode": Config.get_app_mode(),
                "tables": {}
            }
            for table_name in inspector.get_table_names():
                columns = [col["name"] for col in inspector.get_columns(table_name)]
                schema["tables"][table_name] = columns
            for view_name in inspector.get_view_names():
                columns = [col["name"] for col in inspector.get_columns(view_name)]
                schema["tables"][view_name] = columns
            return schema
        except Exception as e:
            logger.error(f"Erro ao obter esquema do banco de dados: {str(e)}")
            return {
                "db_type": Config.DB_TYPE,
                "app_mode": Config.get_app_mode(),
                "tables": {},
                "error": str(e)
            }

    @staticmethod
    @log_performance
    def get_dynamic_kpi_data(card_config: dict):
        script_id = card_config.get("script_id")
        column = card_config.get("column")
        scripts = ScriptManager.get_all()
        script = next((s for s in scripts if s.get("id") == script_id), None)
        
        if not script:
            return {"error": "Script não encontrado"}

        results = DataManager.execute_user_script(script["query"])
        if not results or "error" in results:
            return {"error": "Falha na execução"}

        try:
            values = [float(row.get(column, 0)) for row in results if column in row]
            current_value = values[-1] if values else 0
            
            trend = 0
            if len(values) > 1:
                prev = values[-2]
                trend = round(((current_value - prev) / prev * 100), 2) if prev != 0 else 0

            status = "success"
            success_th = card_config.get("threshold_success", 0)
            warning_th = card_config.get("threshold_warning", 0)
            
            if current_value < warning_th:
                status = "critical"
            elif current_value < success_th:
                status = "warning"
                
            return {
                "id": card_config.get("id"),
                "title": card_config.get("title"),
                "value": str(current_value),
                "trend": trend,
                "status": status,
                "spark": values[-7:]
            }
        except Exception as e:
            return {"error": str(e)}

    @staticmethod
    @log_performance
    def get_dynamic_chart_data(chart_config: dict):
        script_id = chart_config.get("script_id")
        scripts = ScriptManager.get_all()
        script = next((s for s in scripts if s.get("id") == script_id), None)
        
        if not script:
            return {"error": "Script não encontrado"}

        results = DataManager.execute_user_script(script["query"])
        if not results or "error" in results:
            return {"error": "Falha na execução"}

        return {
            "id": chart_config.get("id"),
            "title": chart_config.get("title"),
            "chartType": chart_config.get("chartType"),
            "xAxis": chart_config.get("xAxis"),
            "yAxes": chart_config.get("yAxes", []),
            "data": results
        }

    @staticmethod
    @log_performance
    def execute_user_script(query: str):
        query_up = query.upper()
        if Config.get_app_mode() == "DEMO":
            dates = pd.date_range(start="2024-01-01", periods=30, freq="D")
            high_values = np.random.randint(1000, 10000, 30)
            data = pd.DataFrame({
                "id": high_values,
                "date": dates.strftime("%Y-%m-%d"),
                "value": high_values,
                "revenue": high_values,
                "sales": high_values,
                "churn": high_values,
                "faturamento": high_values,
                "region": np.random.choice(["Norte", "Sul", "Leste", "Oeste"], 30)
            }).to_dict(orient="records")
            logger.info(f"DEMO DATA GENERATED (30 periods) - Sample Value: {high_values[-1]}")
            return data

        try:
            engine = create_engine(Config.get_db_url())
            with engine.connect() as conn:
                df = pd.read_sql(text(query), conn)
                return df.to_dict(orient="records")
        except Exception as e:
            logger.error(f"Erro na execução SQL: {str(e)}")
            return {"error": str(e)}

    @staticmethod
    @log_performance
    def get_kpis(page="home"):
        try:
            layout = LayoutManager.get(page)
            cards = layout.get("cards", [])
            results = []
            for card in cards:
                data = DataManager.get_dynamic_kpi_data(card)
                if "error" not in data:
                    results.append(data)
            return results
        except Exception as e:
            logger.error(f"Erro ao processar KPIs para {page}: {str(e)}")
            return []

    @staticmethod
    @log_performance
    def get_charts(page="home"):
        try:
            layout = LayoutManager.get(page)
            charts = layout.get("charts", [])
            results = []
            for chart in charts:
                data = DataManager.get_dynamic_chart_data(chart)
                if "error" not in data:
                    results.append(data)
            return results
        except Exception as e:
            logger.error(f"Erro ao processar gráficos para {page}: {str(e)}")
            return []

    @staticmethod
    def get_revenue_history():
        dates = pd.date_range(start="2023-10-01", periods=30, freq="D").strftime("%b %d").tolist()
        values = (np.sin(np.linspace(0, 5, 30)) * 500000 + 1000000).tolist()
        return [{"date": d, "revenue": v} for d, v in zip(dates, values)]

    @staticmethod
    def get_noc_data():
        return {
            "metrics": DataManager.get_kpis(page="noc"),
            "realtime_sales": DataManager.get_revenue_history()[-10:],
            "system_status": "OPERATIONAL",
            "uptime": "99.998%",
            "last_update": datetime.now().strftime("%H:%M:%S")
        }

    @staticmethod
    def get_reports(filters=None):
        dates = pd.date_range(start="2024-01-01", end=datetime.now(), freq="D")
        regions = ["Norte", "Sul", "Leste", "Oeste"]
        data = []
        for i in range(100):
            chosen_date = pd.to_datetime(np.random.choice(dates))
            data.append({
                "id": i + 1,
                "date": chosen_date.strftime("%Y-%m-%d"),
                "region": np.random.choice(regions),
                "sales": np.random.randint(1000, 10000),
                "category": np.random.choice(["Hardware", "Software", "Serviços"]),
                "profit_margin": round(np.random.uniform(0.1, 0.4), 2)
            })
        return data

    @staticmethod
    def save_annotation(context: str, comment: str):
        logger.info(f"Salvando anotação para {context}: {comment}")
        return True
