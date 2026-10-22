import tkinter as tk
from tkinter import ttk
import threading
import time
import ctypes

try:
    import pyautogui
    HAS_PYAUTO = True
except ImportError:
    HAS_PYAUTO = False

try:
    import keyboard
    HAS_KEYBOARD = True
except ImportError:
    HAS_KEYBOARD = False

def press_key(key):
    try:
        if HAS_KEYBOARD:
            keyboard.press_and_release(key)
            return True
        elif HAS_PYAUTO:
            pyautogui.press(key)
            return True
    except: pass
    vk_map = {'1': 0x31, '2': 0x32, '3': 0x33, '4': 0x34, 'space': 0x20, 'v': 0x56, 'w': 0x57}
    vk = vk_map.get(key, 0x31)
    ctypes.windll.user32.keybd_event(vk, 0, 0, 0)
    time.sleep(0.03)
    ctypes.windll.user32.keybd_event(vk, 0, 2, 0)
    return True

def hold_key(key, hold=False):
    vk_map = {'w': 0x57}
    vk = vk_map.get(key, 0x57)
    flag = 0 if hold else 2
    ctypes.windll.user32.keybd_event(vk, 0, flag, 0)

def get_screen_size():
    try:
        if HAS_PYAUTO:
            return pyautogui.size()
    except: pass
    return (ctypes.windll.user32.GetSystemMetrics(0), ctypes.windll.user32.GetSystemMetrics(1))

def move_mouse(x, y):
    try:
        if HAS_PYAUTO:
            pyautogui.moveTo(x, y, duration=0.3)
            return
    except: pass
    ctypes.windll.user32.SetCursorPos(int(x), int(y))

class ClickerGUI:
    def __init__(self, root):
        root.title("Spirit Vale - Spam Clicker")
        root.geometry("420x580")
        root.attributes("-topmost", True)
        root.resizable(False, False)

        ttk.Label(root, text="SPAM SKILL - ALL IN (1 2 3 4 + SPASI + V + W)", font=("Segoe UI", 10, "bold")).pack(pady=6)
        ttk.Label(root, text="SMART CD: tiap tombol pencet pas cooldown ready", font=("Segoe UI", 7)).pack()

        frame_keys = ttk.LabelFrame(root, text="Tombol yang di-spam (semua aktif - ALL IN)", padding=6)
        frame_keys.pack(pady=4, padx=10, fill="x")

        self.var_1 = tk.BooleanVar(value=True)
        self.var_2 = tk.BooleanVar(value=True)
        self.var_3 = tk.BooleanVar(value=True)
        self.var_4 = tk.BooleanVar(value=True)
        self.var_space = tk.BooleanVar(value=True)
        self.var_v = tk.BooleanVar(value=True)
        self.var_w = tk.BooleanVar(value=True)

        # simpan cooldown per tombol
        self.cd_1 = tk.DoubleVar(value=0.6)
        self.cd_2 = tk.DoubleVar(value=5.0)
        self.cd_3 = tk.DoubleVar(value=6.0)
        self.cd_4 = tk.DoubleVar(value=8.0)
        self.cd_space = tk.DoubleVar(value=2.0)
        self.cd_v = tk.DoubleVar(value=3.0)
        self.cd_w = tk.DoubleVar(value=0.3)

        def add_row(label, var, cd):
            row = ttk.Frame(frame_keys)
            row.pack(fill="x", pady=1)
            ttk.Checkbutton(row, text=label, variable=var, width=18).pack(side="left")
            ttk.Label(row, text="CD:").pack(side="left")
            s = ttk.Scale(row, from_=0.3, to=10.0, variable=cd, orient="horizontal", length=105)
            s.pack(side="left", padx=3)
            lbl = ttk.Label(row, text=f"{cd.get():.1f}s", width=5)
            lbl.pack(side="left")
            cd.trace_add("write", lambda *_: lbl.config(text=f"{cd.get():.1f}s"))

        add_row("Tombol 1 - Soul Strike", self.var_1, self.cd_1)
        add_row("Tombol 2 - Well", self.var_2, self.cd_2)
        add_row("Tombol 3 - Bond", self.var_3, self.cd_3)
        add_row("Tombol 4 - Skill 4", self.var_4, self.cd_4)
        add_row("SPASI", self.var_space, self.cd_space)
        add_row("Tombol V", self.var_v, self.cd_v)
        add_row("Tombol W", self.var_w, self.cd_w)

        self.w_mode = tk.StringVar(value="hold")
        frame_w = ttk.Frame(frame_keys)
        frame_w.pack(fill="x")
        ttk.Label(frame_w, text="  W mode:", font=("Segoe UI", 7)).pack(side="left")
        ttk.Radiobutton(frame_w, text="Spam CD", variable=self.w_mode, value="spam").pack(side="left", padx=2)
        ttk.Radiobutton(frame_w, text="Tahan terus", variable=self.w_mode, value="hold").pack(side="left", padx=2)

        # jeda antar cast biar gak cancel animasi 0.5s
        frame_global = ttk.Frame(root)
        frame_global.pack(pady=3)
        ttk.Label(frame_global, text="Jeda antar cast:").pack(side="left")
        self.cast_delay = tk.DoubleVar(value=0.6)
        ttk.Scale(frame_global, from_=0.2, to=1.5, variable=self.cast_delay, orient="horizontal", length=110).pack(side="left", padx=4)
        self.lbl_cast = ttk.Label(frame_global, text="0.60s")
        self.lbl_cast.pack(side="left")
        self.cast_delay.trace_add("write", lambda *_: self.lbl_cast.config(text=f"{self.cast_delay.get():.2f}s"))

        # Mouse sweep DIHAPUS sesuai request - nanti dulu
        self.var_mouse = tk.BooleanVar(value=False)
        self.mouse_interval = tk.DoubleVar(value=2.0)
        self.mouse_range = tk.StringVar(value="selayar")

        self.status_var = tk.StringVar(value="Status: STOP - Siap spam 1 doang")
        self.label_status = tk.Label(root, textvariable=self.status_var, font=("Segoe UI", 11, "bold"), fg="red", bg="#f0f0f0")
        self.label_status.pack(pady=6)
        ttk.Label(root, text="Klik START/STOP aja | Game harus fokus", font=("Segoe UI", 8)).pack()

        frame_btn = ttk.Frame(root)
        frame_btn.pack(pady=8)
        self.btn_start = tk.Button(frame_btn, text="▶  START", command=self.start, font=("Segoe UI", 14, "bold"), bg="#2ecc71", fg="white", activebackground="#27ae60", padx=24, pady=10, relief="raised", bd=3, width=10)
        self.btn_start.pack(side="left", padx=10)
        self.btn_stop = tk.Button(frame_btn, text="■  STOP", command=self.stop, font=("Segoe UI", 14, "bold"), bg="#e74c3c", fg="white", activebackground="#c0392b", padx=24, pady=10, relief="raised", bd=3, width=10, state="disabled")
        self.btn_stop.pack(side="left", padx=10)

        self.topmost_var = tk.BooleanVar(value=True)
        ttk.Checkbutton(root, text="Always on Top", variable=self.topmost_var, command=self.toggle_topmost).pack()
        self.count_var = tk.StringVar(value="Mode: SMART CD 0.6s + jeda cast - anti skip")
        ttk.Label(root, textvariable=self.count_var, font=("Segoe UI", 7)).pack(pady=2)

        self.running = False
        self.w_held = False
        self.mouse_dir = 1
        self.last_press = {}

        self.setup_hotkey()
        root.protocol("WM_DELETE_WINDOW", self.on_close)

    def toggle_topmost(self):
        self.master.attributes("-topmost", self.topmost_var.get())

    def setup_hotkey(self):
        # Hotkey F6/F7 dimatiin - cuma pakai klik START/STOP aja
        pass

    def get_cfg(self):
        return [
            ('1', self.var_1, self.cd_1),
            ('2', self.var_2, self.cd_2),
            ('3', self.var_3, self.cd_3),
            ('4', self.var_4, self.cd_4),
            ('space', self.var_space, self.cd_space),
            ('v', self.var_v, self.cd_v),
            ('w', self.var_w, self.cd_w),
        ]
    def get_skill_cfg(self):
        return [(k,v,cd) for k,v,cd in self.get_cfg() if k not in ('space','w')]

    def smart_loop(self):
        # W hold
        if self.var_w.get() and self.w_mode.get() == "hold":
            try:
                if HAS_KEYBOARD: keyboard.press('w')
                else: hold_key('w', True)
                self.w_held = True
            except: pass
        now = time.time()
        self.last_press = {}
        for k, var, cd in self.get_cfg():
            if k=='w' and self.w_mode.get()=="hold": continue
            if k in ('space','w'): continue  # spasi & W spam bebas, tidak masuk CD skill
            self.last_press[k] = now - cd.get()
        # timer khusus movement (wajib terus)
        last_space = 0
        last_w_spam = 0
        last_any = 0
        count = 0
        # skill cfg (tanpa spasi/W)
        skill_cfg = [(k,v,cd) for k,v,cd in self.get_cfg() if k not in ('space','w')]
        next_idx = 0
        while self.running:
            now = time.time()
            # 1) SPASI & W spam terus (beda jalur, gak kena jeda cast skill)
            if self.var_space.get() and now - last_space >= self.cd_space.get():
                press_key('space')
                last_space = now
                count+=1
                self.count_var.set(f"Pressed space | total {count}")
            if self.var_w.get() and self.w_mode.get() == "spam" and now - last_w_spam >= self.cd_w.get():
                press_key('w')
                last_w_spam = now
                count+=1
                self.count_var.set(f"Pressed w | total {count}")

            # 2) Skill 1-4 + V pakai jeda cast + CD + round-robin
            if now - last_any >= self.cast_delay.get():
                pressed=False
                for i in range(len(skill_cfg)):
                    idx = (next_idx + i) % len(skill_cfg) if skill_cfg else 0
                    if not skill_cfg: break
                    key,var,cd = skill_cfg[idx]
                    if not var.get(): continue
                    if now - self.last_press.get(key,0) >= cd.get():
                        press_key(key)
                        self.last_press[key]=now
                        last_any=now
                        count+=1
                        self.count_var.set(f"Pressed {key} | total {count}")
                        next_idx = (idx + 1) % len(skill_cfg)
                        pressed=True
                        time.sleep(0.04)
                        break
                if not pressed and skill_cfg:
                    # majuin pointer biar adil
                    next_idx = (next_idx + 1) % len(skill_cfg)
            time.sleep(0.02)

        if self.w_held:
            try:
                if HAS_KEYBOARD: keyboard.release('w')
                else: hold_key('w', False)
            except: pass
            self.w_held=False

    def mouse_loop(self):
        sw,sh=get_screen_size()
        y=int(sh*0.5)
        if self.mouse_range.get()=="selayar":
            x_left,x_right=int(sw*0.15),int(sw*0.85)
        else:
            x_left,x_right=int(sw*0.35),int(sw*0.65)
        while self.running and self.var_mouse.get():
            target=x_right if self.mouse_dir>0 else x_left
            move_mouse(target,y)
            self.mouse_dir*=-1
            for _ in range(int(self.mouse_interval.get()*10)):
                if not self.running or not self.var_mouse.get(): break
                time.sleep(0.1)

    def start(self):
        if self.running: return
        has_any=any(v.get() for _,v,_ in self.get_cfg()) or self.var_mouse.get()
        if not has_any:
            self.status_var.set("Centang 1 dulu!")
            return
        self.running=True
        keys='+'.join([k for k,v,_ in self.get_cfg() if v.get()])
        has_w_hold=self.var_w.get() and self.w_mode.get()=="hold"
        display=keys+("+W(hold)" if has_w_hold else "")+("+MOUSE" if self.var_mouse.get() else "")
        self.status_var.set(f"RUNNING SMART: {display}")
        self.label_status.config(fg="green")
        self.btn_start.config(state="disabled", bg="#95a5a6")
        self.btn_stop.config(state="normal", bg="#e74c3c")
        threading.Thread(target=self.smart_loop, daemon=True).start()
        if self.var_mouse.get():
            threading.Thread(target=self.mouse_loop, daemon=True).start()

    def stop(self):
        if not self.running: return
        self.running=False
        self.status_var.set("Status: STOP")
        self.label_status.config(fg="red")
        self.btn_start.config(state="normal", bg="#2ecc71")
        self.btn_stop.config(state="disabled", bg="#95a5a6")

    def on_close(self):
        self.running=False
        if self.w_held:
            try:
                if HAS_KEYBOARD: keyboard.release('w')
                else: hold_key('w', False)
            except: pass
        if HAS_KEYBOARD:
            try: keyboard.unhook_all_hotkeys()
            except: pass
        self.master.destroy()

if __name__=="__main__":
    if HAS_PYAUTO:
        pyautogui.FAILSAFE=False
        pyautogui.PAUSE=0
    root=tk.Tk()
    app=ClickerGUI(root)
    app.master=root
    root.mainloop()
