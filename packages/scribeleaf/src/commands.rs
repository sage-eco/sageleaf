use serde_json::Value;
use tauri::State;

use crate::state::{FormMeta, FormState, SharedFormState};

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
