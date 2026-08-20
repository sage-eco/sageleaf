use std::sync::Arc;

use tauri::{
    plugin::{Builder, TauriPlugin},
    Manager, Runtime,
};
use tokio::sync::{Mutex, RwLock};

mod commands;
mod error;
mod server;
mod state;

pub use error::{Error, Result};
pub use state::{FormMeta, FormState, ScribeleafServerHandle, SharedFormState};

pub fn init<R: Runtime>() -> TauriPlugin<R> {
    Builder::new("sageleaf-scribeleaf")
        .invoke_handler(tauri::generate_handler![
            commands::register_form,
            commands::update_form_data,
            commands::unregister_form,
            commands::scribeleaf_status,
            commands::scribeleaf_restart,
        ])
        .setup(|app, _api| {
            let state: SharedFormState = Arc::new(RwLock::new(None));
            app.manage(state.clone());
            let server_handle: ScribeleafServerHandle = Arc::new(Mutex::new(None));
            app.manage(server_handle.clone());
            let app_handle = app.clone();
            tauri::async_runtime::spawn(async move {
                if let Err(err) = commands::start_server(app_handle, state, server_handle).await {
                    log::error!("scribeleaf: failed to start server: {err}");
                }
            });
            Ok(())
        })
        .build()
}
