use std::sync::Arc;

use tauri::{
    plugin::{Builder, TauriPlugin},
    Manager, Runtime,
};
use tokio::sync::RwLock;

mod commands;
mod error;
mod server;
mod state;

pub use error::{Error, Result};
pub use state::{FormMeta, FormState, SharedFormState};

pub fn init<R: Runtime>() -> TauriPlugin<R> {
    Builder::new("sageleaf-scribeleaf")
        .invoke_handler(tauri::generate_handler![
            commands::register_form,
            commands::update_form_data,
            commands::unregister_form,
        ])
        .setup(|app, _api| {
            let state: SharedFormState = Arc::new(RwLock::new(None));
            app.manage(state.clone());
            let app_handle = app.clone();
            tauri::async_runtime::spawn(server::serve(state, app_handle));
            Ok(())
        })
        .build()
}
