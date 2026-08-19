const COMMANDS: &[&str] = &[
    "register_form",
    "update_form_data",
    "unregister_form",
    "scribeleaf_status",
    "scribeleaf_restart",
];

fn main() {
    tauri_plugin::Builder::new(COMMANDS).build();
}
