# Scripts

## Video Compression

Use the `compress-video` script to shrink MP4 or MOV files for the site with browser-friendly H.264 output:

```sh
bun run compress-video public/videos/case-studies/example.mov --output public/videos/case-studies/example.mp4
```

By default, the script writes `example.compressed.mp4` next to the source file. Use `--output` when compressing from a source MOV into a site-ready MP4. To replace an existing source video used by the site, pass `--replace`:

```sh
bun run compress-video public/videos/case-studies/example.mp4 --replace
```

Replace mode keeps the first original file under `.cache/original-videos/`, then writes the compressed file back to `example.mp4`.

Useful options:

```sh
bun run compress-video <input-video> --crf 26 --max-width 1280 --preset slow
```

- `--crf`: H.264 quality value. Lower is larger and higher quality. Default: `28`.
- `--max-width`: Downscale videos wider than this value. Default: `1280`.
- `--preset`: x264 compression preset. Slower presets usually produce smaller files. Default: `slow`.

The script requires `ffmpeg` and `ffprobe` to be installed locally.

If the script reports an unsupported or unknown codec, re-export the source video from the editor as H.264, HEVC, or ProRes first. Some editing exports, such as `apv1` MP4 files from DaVinci Resolve, can be probed by `ffprobe` but cannot be decoded by the system `ffmpeg`.
