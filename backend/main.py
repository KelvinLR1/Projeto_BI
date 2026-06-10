from fastapi import FastAPI, Body
from fastapi.middleware.cors import CORSMiddleware
try:
    from .database import DataManager, ScriptManager, LayoutManager, SettingsManager, AssetLibraryManager
except ImportError:
    from database import DataManager, ScriptManager, LayoutManager, SettingsManager, AssetLibraryManager

app = FastAPI(title="HUB BI API")

# Habilitar CORS para o frontend Next.js
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/api/settings")
async def get_settings():
    return SettingsManager.get()

@app.post("/api/settings")
async def save_settings(settings: dict = Body(...)):
    return SettingsManager.save(settings)

@app.get("/api/kpis")
async def get_kpis(page: str = "home"):
    return DataManager.get_kpis(page)

@app.get("/api/revenue")
async def get_revenue():
    return DataManager.get_revenue_history()

@app.get("/api/noc")
async def get_noc():
    return DataManager.get_noc_data()

@app.get("/api/reports")
async def get_reports():
    return DataManager.get_reports()

@app.get("/api/scripts")
async def get_scripts():
    return ScriptManager.get_all()

@app.post("/api/scripts")
async def save_script(data: dict = Body(...)):
    name = data.get("name")
    query = data.get("query")
    description = data.get("description", "")
    group = data.get("group", "Geral")
    subgroup = data.get("subgroup", "Geral")
    show_in_reports = data.get("show_in_reports", True)
    return ScriptManager.save(name, query, description, group, subgroup, show_in_reports)

@app.post("/api/scripts/execute")
async def execute_script(data: dict = Body(...)):
    query = data.get("query")
    return DataManager.execute_user_script(query)

@app.get("/api/charts/{page}")
async def get_charts(page: str = "home"):
    return DataManager.get_charts(page)

@app.get("/api/layouts/{page}")
async def get_layout(page: str):
    """Obtém a configuração dinâmica de cards para uma página."""
    return LayoutManager.get(page)

@app.post("/api/layouts/{page}")
async def save_layout(page: str, config: dict = Body(...)):
    """Salva a configuração dinâmica de cards para uma página."""
    return LayoutManager.save(page, config)

@app.get("/api/library")
async def get_library():
    return AssetLibraryManager.get_all()

@app.post("/api/library")
async def save_to_library(asset: dict = Body(...)):
    return AssetLibraryManager.save(asset)

@app.delete("/api/library/{asset_id}")
async def delete_from_library(asset_id: str):
    return AssetLibraryManager.delete(asset_id)

@app.post("/api/annotations")
async def post_annotation(data: dict = Body(...)):
    context = data.get("context", "General")
    comment = data.get("comment", "")
    success = DataManager.save_annotation(context, comment)
    return {"success": success}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
