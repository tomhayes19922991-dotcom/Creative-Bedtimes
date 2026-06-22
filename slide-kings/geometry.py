"""Procedural geometry helpers for Panda3D (no external model files needed)."""
import math
from panda3d.core import (
    GeomVertexFormat, GeomVertexData, GeomVertexWriter,
    GeomTriangles, Geom, GeomNode,
)


def _new_vdata(name: str, num_rows: int):
    fmt = GeomVertexFormat.get_v3n3c4()
    vdata = GeomVertexData(name, fmt, Geom.UH_static)
    vdata.setNumRows(num_rows)
    return (
        vdata,
        GeomVertexWriter(vdata, "vertex"),
        GeomVertexWriter(vdata, "normal"),
        GeomVertexWriter(vdata, "color"),
    )


def _make_geom_node(name, vdata, tris):
    geom = Geom(vdata)
    geom.addPrimitive(tris)
    node = GeomNode(name)
    node.addGeom(geom)
    return node


def make_box(w: float, d: float, h: float, color=(1, 1, 1, 1)) -> GeomNode:
    """
    Axis-aligned box centred at origin.
    Panda3D coords: X=right, Y=forward, Z=up.
      w = X full-width
      d = Y full-depth
      h = Z full-height
    """
    r, g, b, a = color
    hw, hd, hh = w / 2, d / 2, h / 2

    # 6 faces × 4 verts = 24 rows
    vdata, vw, nw, cw = _new_vdata("box", 24)
    tris = GeomTriangles(Geom.UH_static)

    faces = [
        ([(-hw, -hd, -hh), ( hw, -hd, -hh), ( hw,  hd, -hh), (-hw,  hd, -hh)], (0,  0, -1)),  # bottom
        ([(-hw, -hd,  hh), (-hw,  hd,  hh), ( hw,  hd,  hh), ( hw, -hd,  hh)], (0,  0,  1)),  # top
        ([(-hw, -hd, -hh), (-hw, -hd,  hh), ( hw, -hd,  hh), ( hw, -hd, -hh)], (0, -1,  0)),  # front
        ([( hw,  hd, -hh), ( hw,  hd,  hh), (-hw,  hd,  hh), (-hw,  hd, -hh)], (0,  1,  0)),  # back
        ([(-hw,  hd, -hh), (-hw,  hd,  hh), (-hw, -hd,  hh), (-hw, -hd, -hh)], (-1, 0,  0)),  # left
        ([( hw, -hd, -hh), ( hw, -hd,  hh), ( hw,  hd,  hh), ( hw,  hd, -hh)], (1,  0,  0)),  # right
    ]

    for i, (verts, norm) in enumerate(faces):
        for v in verts:
            vw.addData3(*v)
            nw.addData3(*norm)
            cw.addData4(r, g, b, a)
        b0 = i * 4
        tris.addVertices(b0, b0 + 1, b0 + 2)
        tris.addVertices(b0, b0 + 2, b0 + 3)

    return _make_geom_node("box", vdata, tris)


def make_sphere(radius: float = 1.0, color=(1, 1, 1, 1), lat_segs: int = 9, lon_segs: int = 16) -> GeomNode:
    """UV sphere centred at origin."""
    r, g, b, a = color
    num_rows = lat_segs * lon_segs * 4
    vdata, vw, nw, cw = _new_vdata("sphere", num_rows)
    tris = GeomTriangles(Geom.UH_static)

    idx = 0
    for lat in range(lat_segs):
        phi0 = math.pi * (-0.5 + lat / lat_segs)
        phi1 = math.pi * (-0.5 + (lat + 1) / lat_segs)
        z0, z1 = math.sin(phi0) * radius, math.sin(phi1) * radius
        cr0, cr1 = math.cos(phi0) * radius, math.cos(phi1) * radius
        cn0, cn1 = math.cos(phi0), math.cos(phi1)

        for lon in range(lon_segs):
            th0 = 2 * math.pi * lon / lon_segs
            th1 = 2 * math.pi * (lon + 1) / lon_segs
            c0, s0 = math.cos(th0), math.sin(th0)
            c1, s1 = math.cos(th1), math.sin(th1)

            quad_v = [
                (cr0 * c0, cr0 * s0, z0),
                (cr1 * c0, cr1 * s0, z1),
                (cr1 * c1, cr1 * s1, z1),
                (cr0 * c1, cr0 * s1, z0),
            ]
            quad_n = [
                (cn0 * c0, cn0 * s0, math.sin(phi0)),
                (cn1 * c0, cn1 * s0, math.sin(phi1)),
                (cn1 * c1, cn1 * s1, math.sin(phi1)),
                (cn0 * c1, cn0 * s1, math.sin(phi0)),
            ]
            for v, n in zip(quad_v, quad_n):
                vw.addData3(*v)
                nw.addData3(*n)
                cw.addData4(r, g, b, a)

            tris.addVertices(idx, idx + 1, idx + 2)
            tris.addVertices(idx, idx + 2, idx + 3)
            idx += 4

    return _make_geom_node("sphere", vdata, tris)


def make_cylinder(radius: float, height: float, color=(1, 1, 1, 1), segs: int = 12) -> GeomNode:
    """Upright cylinder (along Z) centred at origin."""
    r, g, b, a = color
    hh = height / 2
    num_rows = segs * 4 + segs * 3 * 2  # side quads + top/bottom tris
    vdata, vw, nw, cw = _new_vdata("cyl", num_rows)
    tris = GeomTriangles(Geom.UH_static)
    idx = 0

    def add_v(x, y, z, nx, ny, nz):
        nonlocal idx
        vw.addData3(x, y, z)
        nw.addData3(nx, ny, nz)
        cw.addData4(r, g, b, a)
        idx += 1
        return idx - 1

    # Side faces
    for i in range(segs):
        th0 = 2 * math.pi * i / segs
        th1 = 2 * math.pi * (i + 1) / segs
        c0, s0 = math.cos(th0), math.sin(th0)
        c1, s1 = math.cos(th1), math.sin(th1)

        i0 = add_v(c0 * radius, s0 * radius, -hh, c0, s0, 0)
        i1 = add_v(c0 * radius, s0 * radius,  hh, c0, s0, 0)
        i2 = add_v(c1 * radius, s1 * radius,  hh, c1, s1, 0)
        i3 = add_v(c1 * radius, s1 * radius, -hh, c1, s1, 0)
        tris.addVertices(i0, i1, i2)
        tris.addVertices(i0, i2, i3)

    # Top and bottom caps
    for cap_z, nz in [(hh, 1), (-hh, -1)]:
        cx = add_v(0, 0, cap_z, 0, 0, nz)
        prev = add_v(radius, 0, cap_z, 0, 0, nz)
        for i in range(1, segs + 1):
            th = 2 * math.pi * i / segs
            curr = add_v(math.cos(th) * radius, math.sin(th) * radius, cap_z, 0, 0, nz)
            if nz > 0:
                tris.addVertices(cx, prev, curr)
            else:
                tris.addVertices(cx, curr, prev)
            prev = curr

    return _make_geom_node("cylinder", vdata, tris)
