#!/usr/bin/env python3
"""Render NebulaOS PWA icons. Original mark: an orbit and a star."""

import math
import os
import struct
import zlib

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, "icons")


def write_png(path, width, height, rgba):
    def chunk(tag, data):
        return struct.pack(">I", len(data)) + tag + data + struct.pack(">I", zlib.crc32(tag + data) & 0xFFFFFFFF)

    raw = b"".join(b"\x00" + rgba[y * width * 4:(y + 1) * width * 4] for y in range(height))
    png = b"\x89PNG\r\n\x1a\n"
    png += chunk(b"IHDR", struct.pack(">IIBBBBB", width, height, 8, 6, 0, 0, 0))
    png += chunk(b"IDAT", zlib.compress(raw, 9))
    png += chunk(b"IEND", b"")
    with open(path, "wb") as handle:
        handle.write(png)


def mix(a, b, t):
    return tuple(a[i] * (1 - t) + b[i] * t for i in range(3))


def sample(x, y, size, maskable):
    cx = cy = size / 2
    nx = (x - cx) / (size / 2)
    ny = (y - cy) / (size / 2)
    t = (ny + 1) / 2
    top = (22, 12, 58)
    mid = (64, 42, 150)
    bot = (16, 70, 104)
    col = mix(top, mid, min(1, t / 0.55)) if t < 0.55 else mix(mid, bot, min(1, (t - 0.55) / 0.45))
    radius = math.hypot(nx, ny)
    shade = max(0, min(1, (radius - 0.15) / 1.15))
    col = tuple(channel * (1 - 0.42 * shade) for channel in col)
    glow = math.exp(-((nx + 0.12) ** 2 + (ny - 0.02) ** 2) * 3.4)
    col = tuple(min(255, col[i] + glow * gain) for i, gain in enumerate((80, 50, 130)))
    glow2 = math.exp(-((nx - 0.42) ** 2 + (ny + 0.32) ** 2) * 5)
    col = tuple(min(255, col[i] + glow2 * gain) for i, gain in enumerate((16, 70, 100)))

    alpha = 255
    if not maskable:
        inset = 0.9
        rad = 0.22
        ax = abs(nx)
        ay = abs(ny)
        qx = ax - (inset - rad)
        qy = ay - (inset - rad)
        dist = math.hypot(max(qx, 0), max(qy, 0)) + min(max(qx, qy), 0) - rad
        aa = 2.2 / size
        alpha = int(max(0, min(1, 0.5 - dist / aa)) * 255)
        if alpha == 0:
            return (0, 0, 0, 0)

    ang = math.radians(-22)
    rx = nx * math.cos(ang) - ny * math.sin(ang)
    ry = nx * math.sin(ang) + ny * math.cos(ang)
    ring = math.exp(-((math.hypot(rx / 0.42, ry / 0.16) - 1) ** 2) * 220)
    col = tuple(min(255, col[i] + ring * gain) for i, gain in enumerate((236, 226, 255)))
    core = math.exp(-(radius ** 2) * 90)
    col = tuple(min(255, col[i] + core * gain) for i, gain in enumerate((255, 246, 220)))
    for sx, sy, strength in ((0.33, -0.2, 110), (-0.36, 0.26, 80), (0.1, 0.34, 55)):
        spark = math.exp(-(math.hypot(nx - sx, ny - sy) ** 2) * 520)
        col = tuple(min(255, col[i] + spark * strength) for i in range(3))
    return tuple(int(channel) for channel in col) + (alpha,)


def render(size, maskable, samples=3):
    buf = bytearray(size * size * 4)
    for y in range(size):
        for x in range(size):
            acc = [0, 0, 0, 0]
            for sy in range(samples):
                for sx in range(samples):
                    px = x + (sx + 0.5) / samples
                    py = y + (sy + 0.5) / samples
                    color = sample(px, py, size, maskable)
                    for i in range(4):
                        acc[i] += color[i]
            offset = (y * size + x) * 4
            for i in range(4):
                buf[offset + i] = int(acc[i] / (samples * samples))
    return bytes(buf)


def main():
    os.makedirs(OUT, exist_ok=True)
    jobs = [
        ("icon-192.png", 192, False),
        ("icon-512.png", 512, False),
        ("icon-maskable-192.png", 192, True),
        ("icon-maskable-512.png", 512, True),
    ]
    for name, size, maskable in jobs:
        print("rendering", name)
        write_png(os.path.join(OUT, name), size, size, render(size, maskable))


if __name__ == "__main__":
    main()
