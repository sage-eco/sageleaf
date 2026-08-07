const COMMANDS: &[&str] = &["register_form", "update_form_data", "unregister_form"];

fn main() {
    tauri_plugin::Builder::new(COMMANDS).build();
}
