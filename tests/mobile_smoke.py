"""Run with Python Playwright and its installed Chromium, from any directory."""
import json
import os
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from threading import Thread
from playwright.sync_api import sync_playwright

root = Path(__file__).resolve().parents[1]
server = ThreadingHTTPServer(("127.0.0.1", 0), partial(SimpleHTTPRequestHandler, directory=root))
Thread(target=server.serve_forever, daemon=True).start()
try:
    with sync_playwright() as p:
        browser = p.chromium.launch(executable_path=os.getenv("CHROMIUM_PATH"))
        page = browser.new_page(viewport={"width":390,"height":844}, is_mobile=True, has_touch=True)
        page.goto(f"http://127.0.0.1:{server.server_port}/")
        key = "luma.pwa.game.v1"
        page.wait_for_function("k => localStorage.getItem(k)", arg=key)
        state = json.loads(page.evaluate("k=>localStorage.getItem(k)", key))
        state["rack"] = [{"shape":"dot","hue":1} for _ in range(3)]
        state["novaTokens"] = 1
        page.evaluate("([k,s])=>localStorage.setItem(k,JSON.stringify(s))", [key,state])
        page.reload()
        other = page.context.new_page()
        other.goto(page.url)
        page.bring_to_front()
        page.locator(".piece-slot").first.tap()
        rect = page.locator("#board").bounding_box()
        cell = rect["width"]/8
        x = rect["x"]+2.5*cell
        y = rect["y"]+1.5*cell+min(98,max(58,1.85*cell))
        cdp = page.context.new_cdp_session(page)
        def touch(kind, points):
            cdp.send("Input.dispatchTouchEvent",{"type":kind,"touchPoints":points})
        touch("touchStart",[{"x":x,"y":y}])
        touch("touchCancel",[])
        touch("touchStart",[{"x":x,"y":y}])
        touch("touchMove",[{"x":x+cell,"y":y+cell}])
        assert page.locator("#ghost").evaluate("e=>e.classList.contains('visible')")
        touch("touchEnd",[])
        page.wait_for_function("k=>JSON.parse(localStorage.getItem(k)).moves===1",arg=key)
        assert json.loads(page.evaluate("k=>localStorage.getItem(k)",key))["board"][2][3]==1
        other.wait_for_function("document.getElementById('score').textContent==='10'")
        assert "hann före" not in other.locator("#toast").inner_text()
        for slot,row in [(1,4),(2,7)]:
            page.locator(".piece-slot").nth(slot).tap()
            page.touchscreen.tap(x, rect["y"]+(row+.5)*cell)
            page.wait_for_function("([k,r])=>JSON.parse(localStorage.getItem(k)).board[r][2]===1",arg=[key,row])
        page.locator("#novaBtn").tap()
        page.touchscreen.tap(x,rect["y"]+.5*cell)
        assert page.locator("#toast").inner_text()=="Välj en fylld ruta"
        assert json.loads(page.evaluate("k=>localStorage.getItem(k)",key))["novaTokens"]==1
        assert page.locator("#cellStatus").inner_text()==""
        page.touchscreen.tap(x+cell,rect["y"]+2.5*cell)
        page.wait_for_function("k=>JSON.parse(localStorage.getItem(k)).novaTokens===0",arg=key)
        assert json.loads(page.evaluate("k=>localStorage.getItem(k)",key))["board"][2][3] is None
        browser.close()
        print("Mobiltest godkänt")
finally:
    server.shutdown()
