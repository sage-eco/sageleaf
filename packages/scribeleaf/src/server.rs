use std::sync::Arc;

use axum::{extract::State, Json};
use serde_json::Value;
use tauri::{AppHandle, Emitter, Runtime};
use tokio::net::TcpListener;
use tower_http::cors::{AllowOrigin, CorsLayer};
use utoipa::OpenApi;
use utoipa_axum::{router::OpenApiRouter, routes};

use crate::error::{Error, Result};
use crate::state::{FormMeta, FormState, SharedFormState};

pub(crate) const PORT: u16 = 47651;
const DATA_UPDATED_EVENT: &str = "scribeleaf://data-updated";

/// Type-erased emitter, so the axum router (and its handlers) stay free of
/// the `R: Runtime` generic that `AppHandle<R>` carries.
type EmitFn = Arc<dyn Fn(&Value) -> tauri::Result<()> + Send + Sync>;

#[derive(Clone)]
struct ServerState {
    form: SharedFormState,
    emit: EmitFn,
}

#[derive(OpenApi)]
#[openapi(components(schemas(FormMeta, FormState)))]
struct ApiDoc;

pub async fn bind() -> std::io::Result<TcpListener> {
    TcpListener::bind(("127.0.0.1", PORT)).await
}

pub async fn run<R: Runtime>(listener: TcpListener, form: SharedFormState, app_handle: AppHandle<R>) {
    let emit: EmitFn = Arc::new(move |data: &Value| app_handle.emit(DATA_UPDATED_EVENT, data));
    let state = ServerState { form, emit };

    let cors = CorsLayer::new().allow_origin(AllowOrigin::predicate(
        |origin, _| matches!(origin.to_str(), Ok(o) if o.starts_with("http://localhost") || o.starts_with("http://127.0.0.1")),
    ));

    let (router, api) = OpenApiRouter::with_openapi(ApiDoc::openapi())
        .routes(routes!(get_form))
        .routes(routes!(get_form_data, patch_form_data))
        .with_state(state)
        .split_for_parts();

    let router = router
        .route("/api-docs/openapi.json", axum::routing::get(async || Json(api)))
        .layer(cors);

    if let Err(err) = axum::serve(listener, router).await {
        log::error!("scribeleaf: server error: {err}");
    }
}

/// Get the currently registered form
#[utoipa::path(
    get,
    path = "/form",
    responses(
        (status = 200, description = "The currently active form", body = FormState),
        (status = 404, description = "No form is currently registered"),
    ),
)]
async fn get_form(State(state): State<ServerState>) -> Result<Json<FormState>> {
    let guard = state.form.read().await;
    let form = guard.as_ref().ok_or(Error::NoActiveForm)?;
    Ok(Json(form.clone()))
}

/// Get the currently registered form's data
#[utoipa::path(
    get,
    path = "/form/data",
    responses(
        (status = 200, description = "The current form data", body = Object),
        (status = 404, description = "No form is currently registered"),
    ),
)]
async fn get_form_data(State(state): State<ServerState>) -> Result<Json<Value>> {
    let guard = state.form.read().await;
    let form = guard.as_ref().ok_or(Error::NoActiveForm)?;
    Ok(Json(form.data.clone()))
}

/// Apply an RFC 6902 JSON Patch to the currently registered form's data
#[utoipa::path(
    patch,
    path = "/form/data",
    request_body(
        content = Object,
        description = "An RFC 6902 JSON Patch array to apply to the form data",
    ),
    responses(
        (status = 200, description = "The merged form data after applying the patch", body = Object),
        (status = 404, description = "No form is currently registered"),
        (status = 422, description = "The patch could not be applied"),
    ),
)]
async fn patch_form_data(
    State(state): State<ServerState>,
    Json(patch): Json<Value>,
) -> Result<Json<Value>> {
    let operations: json_patch::Patch =
        serde_json::from_value(patch).map_err(|err| Error::MalformedBody(err.to_string()))?;

    let mut guard = state.form.write().await;
    let form = guard.as_mut().ok_or(Error::NoActiveForm)?;

    let mut merged = form.data.clone();
    json_patch::patch(&mut merged, &operations)?;
    form.data = merged.clone();

    (state.emit)(&merged)?;

    Ok(Json(merged))
}
