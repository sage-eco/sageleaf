use axum::{http::StatusCode, response::IntoResponse, Json};
use serde::{ser::Serializer, Serialize};
use serde_json::json;

pub type Result<T> = std::result::Result<T, Error>;

#[derive(Debug, thiserror::Error)]
pub enum Error {
    #[error("no form is currently registered")]
    NoActiveForm,
    #[error("failed to apply patch: {0}")]
    PatchFailed(#[from] json_patch::PatchError),
    #[error("malformed request body: {0}")]
    MalformedBody(String),
    #[error(transparent)]
    Tauri(#[from] tauri::Error),
    #[error("io error: {0}")]
    Io(#[from] std::io::Error),
}

impl Serialize for Error {
    fn serialize<S>(&self, serializer: S) -> std::result::Result<S::Ok, S::Error>
    where
        S: Serializer,
    {
        serializer.serialize_str(self.to_string().as_ref())
    }
}

impl IntoResponse for Error {
    fn into_response(self) -> axum::response::Response {
        let status = match &self {
            Error::NoActiveForm => StatusCode::NOT_FOUND,
            Error::PatchFailed(_) => StatusCode::UNPROCESSABLE_ENTITY,
            Error::MalformedBody(_) => StatusCode::BAD_REQUEST,
            Error::Tauri(_) => StatusCode::INTERNAL_SERVER_ERROR,
            Error::Io(_) => StatusCode::INTERNAL_SERVER_ERROR,
        };
        (status, Json(json!({ "error": self.to_string() }))).into_response()
    }
}
