use std::sync::Arc;

use serde::{Deserialize, Serialize};
use serde_json::Value;
use tokio::sync::RwLock;
use utoipa::ToSchema;

#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct FormMeta {
    #[serde(rename = "modelId")]
    pub model_id: String,
    #[serde(rename = "entityName")]
    pub entity_name: String,
    #[serde(rename = "changeId")]
    pub change_id: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct FormState {
    #[schema(value_type = Object)]
    pub schema: Value,
    #[schema(value_type = Object)]
    pub uischema: Value,
    #[schema(value_type = Object)]
    pub data: Value,
    pub meta: FormMeta,
}

pub type SharedFormState = Arc<RwLock<Option<FormState>>>;
