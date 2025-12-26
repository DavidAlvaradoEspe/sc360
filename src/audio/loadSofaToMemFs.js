export async function loadSofaToMemFs(Module, url = "/hrtf/hrtf.sofa") {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Failed to fetch SOFA: ${res.status}`);
    const buf = await res.arrayBuffer();

    const path = "/hrtf.sofa";
    Module.FS.writeFile(path, new Uint8Array(buf));
    return path;
}
