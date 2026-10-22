"""Modern dark theme (Qt Style Sheet)."""

# Palette
BG = "#0d1017"
BG_ALT = "#12161f"
PANEL = "#161b26"
PANEL_HOVER = "#1c2230"
BORDER = "#232a3a"
BORDER_LIGHT = "#2e3749"
TEXT = "#e6eaf2"
TEXT_DIM = "#8b94a7"
ACCENT = "#5b8cff"
ACCENT_HOVER = "#74a0ff"
SUCCESS = "#3fd68c"
DANGER = "#ff6b6b"
WARN = "#ffb454"

QSS = f"""
* {{
    font-family: "Segoe UI", "Inter", system-ui, sans-serif;
    font-size: 13px;
}}

QWidget#root {{
    background: {BG};
    color: {TEXT};
}}

/* ------------------------------------------------------------- panels */
QFrame#sidebar {{
    background: {PANEL};
    border-right: 1px solid {BORDER};
}}

QFrame#videoArea {{
    background: #05070b;
}}

QFrame#toolbar {{
    background: transparent;
}}

/* ------------------------------------------------------------- labels */
QLabel#appTitle {{
    font-size: 20px;
    font-weight: 700;
    color: {TEXT};
    letter-spacing: 0.3px;
}}

QLabel#appSubtitle {{
    font-size: 11px;
    color: {TEXT_DIM};
}}

QLabel#deviceItem {{
    padding: 10px 12px;
    border-radius: 10px;
    color: {TEXT};
}}

QLabel#emptyState {{
    color: {TEXT_DIM};
    font-size: 15px;
}}

QLabel#statusText {{
    color: {TEXT_DIM};
    font-size: 12px;
}}

QLabel#sectionTitle {{
    color: {TEXT_DIM};
    font-size: 11px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 1px;
}}

QLabel#videoOverlay {{
    color: {TEXT};
    background: rgba(9, 12, 18, 0.82);
    border: 1px solid {BORDER};
    border-radius: 12px;
    padding: 14px 20px;
}}

/* ------------------------------------------------------------ buttons */
QPushButton {{
    background: {PANEL_HOVER};
    color: {TEXT};
    border: 1px solid {BORDER_LIGHT};
    border-radius: 10px;
    padding: 9px 18px;
    min-height: 18px;
    text-align: center;
}}

QPushButton:hover {{
    background: #232b3d;
    border-color: {ACCENT};
}}

QPushButton:pressed {{
    background: #1a2130;
}}

QPushButton:disabled {{
    color: {TEXT_DIM};
    background: {BG_ALT};
    border-color: {BORDER};
}}

QPushButton#primary {{
    background: {ACCENT};
    border-color: {ACCENT};
    color: #ffffff;
    font-weight: 700;
}}

QPushButton#primary:hover {{
    background: {ACCENT_HOVER};
    border-color: {ACCENT_HOVER};
}}

QPushButton#danger {{
    background: transparent;
    border-color: {DANGER};
    color: {DANGER};
}}

QPushButton#danger:hover {{
    background: rgba(255, 107, 107, 0.12);
}}

QPushButton#ghost {{
    background: transparent;
    border-color: transparent;
    color: {TEXT_DIM};
    padding: 6px 10px;
}}

QPushButton#ghost:hover {{
    background: {PANEL_HOVER};
    color: {TEXT};
}}

QPushButton#tool {{
    background: rgba(22, 27, 38, 0.85);
    border: 1px solid {BORDER_LIGHT};
    color: {TEXT};
    border-radius: 10px;
    padding: 8px 14px;
    font-size: 15px;
}}

QPushButton#tool:hover {{
    background: {ACCENT};
    border-color: {ACCENT};
    color: #fff;
}}

QPushButton#connectBtn {{
    font-weight: 700;
}}

/* ------------------------------------------------------------ list */
QListWidget {{
    background: transparent;
    border: none;
    outline: none;
}}

QListWidget::item {{
    background: {BG_ALT};
    border: 1px solid {BORDER};
    border-radius: 10px;
    margin: 4px 8px;
    padding: 10px 12px;
    color: {TEXT};
}}

QListWidget::item:selected {{
    background: {PANEL_HOVER};
    border-color: {ACCENT};
}}

QListWidget::item:hover {{
    border-color: {BORDER_LIGHT};
}}

/* -------------------------------------------------------- scrollbar */
QScrollBar:vertical {{
    background: transparent;
    width: 10px;
    margin: 4px 0;
}}

QScrollBar::handle:vertical {{
    background: {BORDER_LIGHT};
    border-radius: 5px;
    min-height: 30px;
}}

QScrollBar::handle:vertical:hover {{
    background: {ACCENT};
}}

QScrollBar::add-line, QScrollBar::sub-line {{
    height: 0px;
}}

QScrollBar:horizontal {{
    background: transparent;
    height: 10px;
}}

QScrollBar::handle:horizontal {{
    background: {BORDER_LIGHT};
    border-radius: 5px;
}}

/* -------------------------------------------------------- input */
QSpinBox, QDoubleSpinBox, QComboBox, QLineEdit {{
    background: {BG_ALT};
    border: 1px solid {BORDER_LIGHT};
    border-radius: 8px;
    padding: 7px 10px;
    color: {TEXT};
    selection-background-color: {ACCENT};
}}

QSpinBox:focus, QComboBox:focus, QLineEdit:focus {{
    border-color: {ACCENT};
}}

QComboBox QAbstractItemView {{
    background: {PANEL};
    border: 1px solid {BORDER_LIGHT};
    selection-background-color: {ACCENT};
    outline: none;
}}

QComboBox::drop-down {{
    border: none;
    width: 24px;
}}

QComboBox::down-arrow {{
    image: none;
    border-left: 5px solid transparent;
    border-right: 5px solid transparent;
    border-top: 6px solid {TEXT_DIM};
    margin-right: 8px;
}}

/* -------------------------------------------------------- checkbox */
QCheckBox {{
    color: {TEXT};
    spacing: 8px;
}}

QCheckBox::indicator {{
    width: 18px;
    height: 18px;
    border: 1px solid {BORDER_LIGHT};
    border-radius: 5px;
    background: {BG_ALT};
}}

QCheckBox::indicator:checked {{
    background: {ACCENT};
    border-color: {ACCENT};
}}

QCheckBox::indicator:hover {{
    border-color: {ACCENT};
}}

/* -------------------------------------------------------- dialog */
QDialog {{
    background: {PANEL};
}}

QDialog QLabel {{
    color: {TEXT};
}}

QDialog QGroupBox {{
    border: 1px solid {BORDER};
    border-radius: 10px;
    margin-top: 14px;
    padding-top: 10px;
    font-weight: 700;
}}

QDialog QGroupBox::title {{
    subcontrol-origin: margin;
    left: 12px;
    padding: 0 6px;
    color: {TEXT_DIM};
}}
"""
