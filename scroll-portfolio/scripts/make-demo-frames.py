"""
데모용 프레임 시퀀스 생성기 (AI 영상이 아직 없을 때 파이프라인을 테스트하는 용도)
- 와이어프레임 건물이 스크롤에 따라 '그려지고' → '불이 켜지는' 120장짜리 시퀀스
- 실제 작업에서는 이 스크립트 대신 scripts/extract-frames.sh 로 AI 영상을 프레임으로 잘라 씁니다.
사용: python3 scripts/make-demo-frames.py [출력폴더] [프레임수]
"""
import sys, os, math
import numpy as np, cv2

out = sys.argv[1] if len(sys.argv) > 1 else "frames/demo"
N = int(sys.argv[2]) if len(sys.argv) > 2 else 120
W, H = 1280, 720
os.makedirs(out, exist_ok=True)

BG_TOP, BG_BOT = (30, 20, 12), (12, 8, 5)         # BGR (짙은 네이비/블랙)
GOLD = (120, 190, 235)                            # BGR 골드
WARM = (140, 210, 255)                            # 창문 불빛

def ease(t): return t*t*(3-2*t)
def lerp(a, b, t): return a + (b-a)*t

bg = np.zeros((H, W, 3), np.uint8)
for y in range(H):
    t = y / H
    bg[y, :] = [lerp(BG_TOP[i], BG_BOT[i], t) for i in range(3)]

# 등각 투영
def proj(x, y, z, s, cx, cy):
    return (int(cx + (x - y) * math.cos(math.radians(30)) * s),
            int(cy + (x + y) * math.sin(math.radians(30)) * s - z * s))

FLOORS, BW, BD, FH = 14, 150, 110, 24   # 층수, 가로, 깊이, 층고

def draw(t):
    img = bg.copy()
    s = lerp(1.45, 1.6, ease(t))
    cx, cy = int(W*0.5), int(H*0.9)
    P = lambda x, y, z: proj(x, y, z, s, cx, cy)
    tA = min(1.0, t / 0.55)          # 선이 그려지는 단계
    tB = max(0.0, (t - 0.45) / 0.55)  # 불이 켜지는 단계

    # 바닥 그리드
    for i in range(-6, 7):
        a = int(18 * (1 - abs(i) / 7))
        cv2.line(img, P(i*60, -400, 0), P(i*60, 400, 0), (a+8, a+6, a+4), 1, cv2.LINE_AA)
        cv2.line(img, P(-400, i*60, 0), P(400, i*60, 0), (a+8, a+6, a+4), 1, cv2.LINE_AA)

    glow = np.zeros_like(img)
    lit_floors = tB * FLOORS
    # 창문 (켜진 층)
    for f in range(FLOORS):
        lit = np.clip(lit_floors - f, 0, 1)
        if lit <= 0: continue
        z0, z1 = f*FH + 4, (f+1)*FH - 4
        col = tuple(int(c * lit) for c in WARM)
        for k in range(5):  # 왼쪽 앞면(y=BD) 창
            x0, x1 = k*BW/5 + 5, (k+1)*BW/5 - 5
            pts = np.array([P(x0, BD, z0), P(x1, BD, z0), P(x1, BD, z1), P(x0, BD, z1)])
            cv2.fillPoly(img, [pts], col, cv2.LINE_AA); cv2.fillPoly(glow, [pts], col, cv2.LINE_AA)
        for k in range(4):  # 오른쪽 앞면(x=BW) 창
            y0, y1 = k*BD/4 + 5, (k+1)*BD/4 - 5
            pts = np.array([P(BW, y0, z0), P(BW, y1, z0), P(BW, y1, z1), P(BW, y0, z1)])
            col2 = tuple(int(c * 0.75) for c in col)
            cv2.fillPoly(img, [pts], col2, cv2.LINE_AA); cv2.fillPoly(glow, [pts], col2, cv2.LINE_AA)

    # 와이어프레임 (아래에서 위로 그려짐)
    visible = tA * FLOORS
    for f in range(FLOORS + 1):
        vis = np.clip(visible - f + 1, 0, 1)
        if vis <= 0: continue
        z = f*FH
        col = tuple(int(c * (0.35 + 0.65*vis)) for c in GOLD)
        # 층 테두리 (앞 두 면 + 뒤 두 면 희미하게)
        cv2.line(img, P(0, BD, z), P(BW, BD, z), col, 1, cv2.LINE_AA)
        cv2.line(img, P(BW, 0, z), P(BW, BD, z), col, 1, cv2.LINE_AA)
        dim = tuple(int(c*0.35) for c in col)
        cv2.line(img, P(0, 0, z), P(0, BD, z), dim, 1, cv2.LINE_AA)
        cv2.line(img, P(0, 0, z), P(BW, 0, z), dim, 1, cv2.LINE_AA)
    zt = min(FLOORS*FH, visible*FH)
    for (x, y, w) in [(BW, BD, 2), (0, BD, 2), (BW, 0, 2), (0, 0, 1)]:
        cv2.line(img, P(x, y, 0), P(x, y, zt), GOLD, w, cv2.LINE_AA)
    # 창문 세로 멀리언
    for k in range(1, 5):
        cv2.line(img, P(k*BW/5, BD, 0), P(k*BW/5, BD, zt), tuple(int(c*0.5) for c in GOLD), 1, cv2.LINE_AA)
    for k in range(1, 4):
        cv2.line(img, P(BW, k*BD/4, 0), P(BW, k*BD/4, zt), tuple(int(c*0.5) for c in GOLD), 1, cv2.LINE_AA)
    # 옥상 + 꼭대기 불빛
    if tA >= 1:
        top = np.array([P(0,0,FLOORS*FH), P(BW,0,FLOORS*FH), P(BW,BD,FLOORS*FH), P(0,BD,FLOORS*FH)])
        cv2.polylines(img, [top], True, GOLD, 1, cv2.LINE_AA)
        if tB > 0.9:
            cv2.circle(glow, P(BW/2, BD/2, FLOORS*FH + 6), 6, WARM, -1, cv2.LINE_AA)
            cv2.circle(img, P(BW/2, BD/2, FLOORS*FH + 6), 3, (255,255,255), -1, cv2.LINE_AA)

    # 발광 처리 + 바닥 반사
    if tB > 0:
        g = cv2.GaussianBlur(glow, (0, 0), 25)
        img = cv2.addWeighted(img, 1.0, g, 0.9, 0)
        refl = np.zeros_like(img)
        cv2.ellipse(refl, P(BW/2, BD/2, 0), (int(220*s), int(60*s)), 0, 0, 360, tuple(int(c*0.5*tB) for c in WARM), -1, cv2.LINE_AA)
        img = cv2.addWeighted(img, 1.0, cv2.GaussianBlur(refl, (0,0), 40), 0.8, 0)
    return img

for i in range(N):
    frame = draw(i / (N - 1))
    cv2.imwrite(os.path.join(out, f"frame_{i+1:03d}.webp"), frame, [cv2.IMWRITE_WEBP_QUALITY, 82])
print(f"{N} frames -> {out}")
