use serde::Serialize;
use serde_json::Value;
use tauri::{AppHandle, Runtime, State};
use utoipa::ToSchema;

use crate::error::Error;
use crate::server;
use crate::state::{FormMeta, FormState, ScribeleafServerHandle, SharedFormState};

#[tauri::command]
pub async fn register_form(
    state: State<'_, SharedFormState>,
    schema: Value,
    uischema: Value,
    data: Value,
    meta: FormMeta,
) -> Result<(), ()> {
    let mut guard = state.write().await;
    *guard = Some(FormState {
        schema,
        uischema,
        data,
        meta,
    });
    Ok(())
}

#[tauri::command]
pub async fn update_form_data(state: State<'_, SharedFormState>, data: Value) -> Result<(), ()> {
    let mut guard = state.write().await;
    if let Some(form) = guard.as_mut() {
        form.data = data;
    }
    Ok(())
}

#[tauri::command]
pub async fn unregister_form(state: State<'_, SharedFormState>) -> Result<(), ()> {
    let mut guard = state.write().await;
    *guard = None;
    Ok(())
}

pub async fn start_server<R: Runtime>(
    app_handle: AppHandle<R>,
    form: SharedFormState,
    server_handle: ScribeleafServerHandle,
) -> crate::error::Result<()> {
    let listener = server::bind().await.map_err(Error::from)?;
    let task = tauri::async_runtime::spawn(server::run(listener, form, app_handle));
    *server_handle.lock().await = Some(task);
    Ok(())
}

#[derive(Serialize, ToSchema)]
#[serde(rename_all = "snake_case")]
pub enum ScribeleafStatus {
    Running,
    Stopped,
}

#[tauri::command]
pub async fn scribeleaf_status() -> ScribeleafStatus {
    match tokio::net::TcpStream::connect(("127.0.0.1", server::PORT)).await {
        Ok(_) => ScribeleafStatus::Running,
        Err(_) => ScribeleafStatus::Stopped,
    }
}

#[tauri::command]
pub async fn scribeleaf_restart<R: Runtime>(
    app_handle: AppHandle<R>,
    form: State<'_, SharedFormState>,
    server_handle: State<'_, ScribeleafServerHandle>,
) -> Result<(), Error> {
    if let Some(handle) = server_handle.lock().await.take() {
        handle.abort();
    }
    start_server(app_handle, form.inner().clone(), server_handle.inner().clone()).await
}
