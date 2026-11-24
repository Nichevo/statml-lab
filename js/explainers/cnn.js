Lab.register({
  id: "cnn",
  group: "Machine learning",
  title: "Convolutional neural networks: reading handwritten digits",
  blurb: "Draw a digit and watch a real, tiny CNN read it: eight learned filters slide over your drawing, pooling shrinks the maps, and a final layer votes. Every number is shown.",
  lede: "A convolutional neural network (CNN) looks at an image through small filters, a few pixels wide, that slide across it looking for one pattern each: a stroke edge, a curve, a corner. The same filter is used everywhere in the image, so the network needs far fewer weights than one that connects every pixel to everything, and it can spot a pattern wherever it appears. This page runs a real CNN, trained on 8,500 handwritten digits, entirely in your browser.",
  quiz: [
    ["A 5×5 filter slides over a 28×28 image with no padding, one pixel at a time. How big is the output map?", "28 − 5 + 1 = 24, so 24×24. The filter's top-left corner can sit in 24 positions across and 24 down."],
    ["This network's first layer has 208 weights. Where does that number come from, and what would a plain dense layer need?", "8 filters × 25 weights each + 8 biases = 208. The same 25 weights are reused at all 576 positions (weight sharing). A dense layer connecting all 784 pixels to just 100 units needs 784 × 100 + 100 = 78,500."],
    ["What does 2×2 max pooling do, and why is it useful?", "It keeps only the largest value in each 2×2 block, halving the width and height. The map gets 4× smaller, and a stroke that moves by a pixel usually still lands in the same block, so small shifts matter less."],
    ["You draw a 7 and the network says 1. Name two likely reasons.", "Your drawing may differ from the training digits: thicker or thinner strokes, a crossed 7, an unusual slant, or off-centre. The model also only saw 8,500 examples and has one convolutional layer. Real systems use more layers, more data and data augmentation."],
    ["How could the same idea be used on weekly demand?", "Use a 1-D convolution: a filter a few weeks long slides along the time series, learning patterns like a promotion spike or a month-end surge. Temporal convolutional networks (TCNs) stack these to forecast."],
    ["After ReLU, a feature map is all zeros. What does that tell you?", "That filter's weighted sum (plus bias) was negative everywhere. The pattern it looks for doesn't appear anywhere in this image, so it contributes nothing to the final vote."],
  ],
  diy: {
    intro: "You can run one convolutional layer in Excel. Put the 28×28 pixel values (0 to 1) in B2:AC29, a 5×5 filter in AF2:AJ6 and its bias in AF8.",
    steps: [
      ["One output value: multiply the 5×5 patch by the filter, add the bias, apply ReLU. Put this in B33, then fill 24 right and 24 down; the relative patch reference slides automatically.", "=MAX(0, SUMPRODUCT(B2:F6, $AF$2:$AJ$6) + $AF$8)"],
      ["2×2 max pooling into a 12×12 block starting at B60.", "=MAX(OFFSET($B$33, 2*(ROW()-ROW($B$60)), 2*(COLUMN()-COLUMN($B$60)), 2, 2))"],
      ["Score for one digit: every pooled value (from all 8 filters) times that digit's weight, plus its bias. With pooled maps in P1:P1152 and weights for digit k in column W.", "=SUMPRODUCT($P$1:$P$1152, W1:W1152) + W_bias"],
      ["Softmax turns the 10 scores in S1:S10 into probabilities.", "=EXP(S1)/SUM(EXP($S$1:$S$10))"],
      ["Prediction: the digit with the highest probability.", "=MATCH(MAX(T1:T10), T1:T10, 0) - 1"],
    ],
  },
  deeper: [
    ["LeCun, Bottou, Bengio & Haffner (1998), Gradient-based learning applied to document recognition, Proc. IEEE 86(11)", "https://doi.org/10.1109/5.726791", "LeNet and the MNIST benchmark"],
    ["Fukushima (1980), Neocognitron, Biological Cybernetics 36", "https://doi.org/10.1007/BF00344251", "the first convolution-and-pooling network"],
    ["Krizhevsky, Sutskever & Hinton, ImageNet classification with deep convolutional neural networks (2012; CACM 2017)", "https://doi.org/10.1145/3065386", "AlexNet, the result that started the deep learning boom"],
    ["Zeiler & Fergus (2014), Visualizing and understanding convolutional networks, arXiv:1311.2901", "https://arxiv.org/abs/1311.2901", "what the filters in each layer learn"],
    ["He, Zhang, Ren & Sun (2016), Deep residual learning for image recognition, arXiv:1512.03385", "https://arxiv.org/abs/1512.03385", "ResNet: how to train very deep CNNs"],
    ["Bai, Kolter & Koltun (2018), An empirical evaluation of generic convolutional and recurrent networks for sequence modeling, arXiv:1803.01271", "https://arxiv.org/abs/1803.01271", "1-D convolutions (TCNs) for time series"],
    ["Goodfellow, Bengio & Courville, Deep Learning, ch. 9: Convolutional networks (free)", "https://www.deeplearningbook.org/contents/convnets.html", "textbook treatment"],
    ["Stanford CS231n notes: Convolutional neural networks", "https://cs231n.github.io/convolutional-networks/", "clear course notes with layer arithmetic"],
    ["Olah, Mordvintsev & Schubert (2017), Feature visualization, Distill", "https://distill.pub/2017/feature-visualization/", "interactive: what deeper CNN layers respond to"],
  ],
  glyph: `<svg viewBox="0 0 96 64" fill="none" stroke="currentColor" stroke-width="2"><rect x="4" y="6" width="40" height="40" rx="2"/><rect x="12" y="14" width="14" height="14" fill="currentColor" fill-opacity=".35"/><path d="M26 14 L58 10 M26 28 L58 26"/><rect x="58" y="10" width="16" height="16" rx="1"/><rect x="62" y="30" width="16" height="16" rx="1"/><rect x="66" y="50" width="12" height="10" rx="1"/><path d="M82 18h10M82 38h10M82 55h10" stroke-width="1.5"/></svg>`,

  mount(root) {
    const { fmt, css, watch } = Lab;
    const D = Lab.cnnData, F = 8, K = 5;
    const W1 = D.W1, b1 = D.b1, W2 = D.W2, b2 = D.b2;
    const CLASSIC = {
      vert: { name: "Vertical edges", w: Array.from({ length: 25 }, (_, i) => [-1, -1, 0, 1, 1][i % 5] / 10), b: 0 },
      horz: { name: "Horizontal edges", w: Array.from({ length: 25 }, (_, i) => [-1, -1, 0, 1, 1][(i / 5) | 0] / 10), b: 0 },
      blur: { name: "Blur", w: Array(25).fill(1 / 25), b: 0 },
    };
    const hexIn = (s) => Array.from(s, (ch) => parseInt(ch, 16) / 15);
    const cell = "padding:6px 8px;border-bottom:1px solid var(--grid)";
    const h4 = (t) => `<h4 style="margin:0 0 8px;font:600 .72rem/1 var(--font-mono);letter-spacing:.1em;text-transform:uppercase;color:var(--muted)">${t}</h4>`;
    const px = "image-rendering:pixelated;image-rendering:crisp-edges;display:block;width:100%;border:1px solid var(--line);border-radius:4px";

    root.innerHTML = Lab.page(this, {
      figure: `
        <div class="plot" style="padding:14px">
          ${h4("Draw a digit, 0 to 9")}
          <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,230px),1fr));gap:16px;align-items:start">
            <div>
              <canvas id="pad" width="280" height="280" style="display:block;width:100%;max-width:280px;aspect-ratio:1;border:1px solid var(--line);border-radius:8px;background:var(--bg);touch-action:none;cursor:crosshair" aria-label="Drawing pad: draw a digit with your mouse or finger"></canvas>
              <div class="btns" style="margin-top:8px"><button class="btn" id="clear" type="button">Clear</button><button class="btn" id="ex" type="button">Example digit</button><button class="btn" id="miss" type="button">One it gets wrong</button></div>
              <p class="hint" id="srcNote" style="margin-top:6px"></p>
            </div>
            <div>
              <div style="display:grid;grid-template-columns:96px 1fr;gap:12px;align-items:center">
                <div><canvas id="in28" width="28" height="28" style="${px}"></canvas><p class="hint" style="margin:4px 0 0;text-align:center">28×28 input</p></div>
                <div><div class="hint" style="margin:0">The network reads</div><div class="big" id="pred" style="font-size:3rem"></div><div class="hint" id="conf" style="margin:0"></div></div>
              </div>
              <div id="probs" style="display:grid;gap:3px;margin-top:12px;font:.8rem/1.2 var(--font-mono)"></div>
            </div>
          </div>
        </div>
        <div class="plot" style="padding:14px">
          ${h4("Layer 1: eight learned filters and what they find")}
          <p class="hint" style="margin:0 0 10px">Each column is one filter. Top: its 5×5 weights (<span style="color:var(--accent)">blue = positive</span>, <span style="color:var(--warm)">orange = negative</span>). Middle: the 24×24 map after sliding it over your digit and applying ReLU. Bottom: after 2×2 max pooling, 12×12. Click a filter to work through it below.</p>
          <div id="maps" style="display:grid;grid-template-columns:repeat(auto-fit,minmax(70px,1fr));gap:8px"></div>
        </div>
        <div class="plot" style="padding:14px">
          <div style="display:flex;flex-wrap:wrap;gap:8px;align-items:center;justify-content:space-between;margin-bottom:8px">
            ${h4("One convolution step, worked out").replace("margin:0 0 8px", "margin:0")}
            <div class="seg" id="ksrc" style="min-width:min(100%,380px)"><button type="button" data-v="learned" aria-pressed="true">Learned filter</button><button type="button" data-v="vert" aria-pressed="false">Vertical edges</button><button type="button" data-v="horz" aria-pressed="false">Horizontal edges</button><button type="button" data-v="blur" aria-pressed="false">Blur</button></div>
          </div>
          <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,220px),1fr));gap:16px;align-items:start">
            <div><canvas id="big" width="24" height="24" style="${px};max-width:260px;cursor:pointer" aria-label="Feature map before ReLU; click to choose a position"></canvas>
              <p class="hint" style="margin:4px 0 0">Map <b>before</b> ReLU: <span style="color:var(--accent)">blue</span> = pattern found, <span style="color:var(--warm)">orange</span> = negative (ReLU sets these to 0). The dark cell is the one worked out on the right; it starts at the filter's strongest response. Click the map to move it.</p></div>
            <div id="work" style="min-width:0;overflow-x:auto"></div>
          </div>
        </div>
        <div class="plot" style="padding:14px">
          ${h4("How the last layer decides")}
          <p class="hint" style="margin:0 0 10px" id="voteTxt"></p>
          <div id="vote" style="display:grid;gap:4px;font:.8rem/1.2 var(--font-mono)"></div>
        </div>
        <div class="plot" style="padding:14px">
          ${h4("How good is it? Digits it never saw in training")}
          <p class="hint" style="margin:0 0 10px">${D.nTest.toLocaleString()} held-out digits: <b style="color:var(--ink)">${(D.acc * 100).toFixed(1)}% correct</b>. Rows are the true digit, columns what the network said. Off-diagonal cells are mistakes.</p>
          <div style="overflow-x:auto"><table id="cm" style="border-collapse:collapse;font:.78rem/1 var(--font-mono);font-variant-numeric:tabular-nums"></table></div>
        </div>`,
      panel: `
        <div class="ctrl"><label for="flt">Filter to inspect <output id="fltV"></output></label><input type="range" id="flt" min="1" max="8" step="1" value="1"></div>
        <div class="ctrl"><label for="pr">Box row <output id="prV"></output></label><input type="range" id="pr" min="0" max="23" step="1" value="10"></div>
        <div class="ctrl"><label for="pc">Box column <output id="pcV"></output></label><input type="range" id="pc" min="0" max="23" step="1" value="10"></div>
        <div class="ctrl"><label for="sx">Shift digit right <output id="sxV"></output></label><input type="range" id="sx" min="-6" max="6" step="1" value="0"></div>
        <div class="ctrl"><label for="sy">Shift digit down <output id="syV"></output></label><input type="range" id="sy" min="-6" max="6" step="1" value="0"></div>
        <div class="ctrl"><label for="noise">Random noise added <output id="noiseV"></output></label><input type="range" id="noise" min="0" max="0.8" step="0.05" value="0"></div>
        <div class="readouts" id="ro"></div>
        <div class="btns"><button class="btn" id="reset" type="button">Reset</button></div>`,
      notes: `
        <section>
          <h2>What happens to your digit</h2>
          <ol>
            <li><b>Prepare.</b> Your drawing is cropped, scaled to fit a 20×20 box and centred by its centre of mass in a 28×28 grid, just as the training digits were. Each pixel becomes a number from 0 (blank) to 1 (ink).</li>
            <li><b>Convolve.</b> Each of 8 filters (5×5 weights) slides over the image. At every position it multiplies the 25 pixels under it by its weights, adds them up and adds a bias.</li>
            <li><b>ReLU.</b> Negative results become 0: "this pattern isn't here".</li>
            <li><b>Pool.</b> Each 2×2 block keeps only its largest value, shrinking each 24×24 map to 12×12.</li>
            <li><b>Vote.</b> All 8 × 144 = 1,152 pooled values are multiplied by a weight for each digit and summed into 10 scores. Softmax turns the scores into probabilities.</li>
          </ol>
          <div class="eq">map[i,j] = ReLU( b + Σ<sub>u,v</sub> w[u,v] × pixel[i+u, j+v] )<br>pooled[i,j] = max of map over the 2×2 block<br>score<sub>k</sub> = b<sub>k</sub> + Σ pooled × W<sub>k</sub> &nbsp;&nbsp; P(k) = e<sup>score<sub>k</sub></sup> / Σ e<sup>score</sup></div>
        </section>
        <section>
          <h2>Why convolution suits images</h2>
          <ul>
            <li><b>Weight sharing.</b> One filter is reused at all 576 positions, so a stroke detector learned in one corner works everywhere. This layer has 208 weights. A dense layer of 100 units on 784 pixels would need 78,500.</li>
            <li><b>Local patterns first.</b> Edges and curves are local, so a small window is enough. Deeper CNNs stack layers so later filters combine edges into loops, corners and whole shapes.</li>
            <li><b>Some shift tolerance.</b> Pooling, and the training itself (digits were randomly nudged ±2 pixels), let the network cope with small moves. Push the shift sliders to 5 or 6 and it starts to fail. A one-layer CNN only tolerates so much.</li>
          </ul>
          <p>The model was trained here with gradient descent (Adam), 10 passes over 8,500 MNIST digits. It has 11,738 weights in total: 208 in the filters and 11,530 in the final layer.</p>
        </section>
        <section>
          <h2>Try this</h2>
          <ol>
            <li>Draw a 1, then a 7. Watch which filters light up. Vertical-stroke filters fire for both; the 7's top bar switches on a horizontal-edge filter.</li>
            <li>Load "One it gets wrong". Look at the probability bars: the runner-up is usually the right answer, and the digit is genuinely ambiguous.</li>
            <li>Slide the noise up. Prediction holds up surprisingly well until about 0.4, because each filter averages 25 pixels.</li>
            <li>Shift the digit 2 pixels: little changes. Shift it 6: the prediction often breaks, because no training digit sat that far off-centre.</li>
            <li>Switch the worked example to "Vertical edges" and move the box onto the left and right side of a stroke: one side is strongly positive, the other negative.</li>
          </ol>
        </section>
        <section>
          <h2>From images to demand data</h2>
          <p>Convolution works on any data with a grid or sequence. On a demand series, a 1-D filter a few weeks long slides along time instead of across pixels. One filter might learn "a spike followed by a dip" (a promotion and its pull-forward), another a month-end pattern. Temporal convolutional networks stack these, and they are competitive with recurrent networks for forecasting.</p>
          <p>Related: <a href="#gradient-descent">gradient descent</a> (how the weights were learned), <a href="#bias-variance">bias–variance</a> (why more parameters need more data), <a href="#attention">attention</a> (the other big architecture) and <a href="#pca-clustering">PCA</a>.</p>
        </section>`,
    });

    const $ = (s) => root.querySelector(s);
    // ---- colours from the theme
    const rgbOf = (() => { const c = document.createElement("canvas"); c.width = c.height = 1; const g = c.getContext("2d", { willReadFrequently: true }); return (col) => { g.clearRect(0, 0, 1, 1); g.fillStyle = col; g.fillRect(0, 0, 1, 1); return Array.from(g.getImageData(0, 0, 1, 1).data.slice(0, 3)); }; })();
    let C = {};
    const theme = () => { C = { bg: rgbOf(css("--bg")), surf: rgbOf(css("--surface")), ink: rgbOf(css("--ink")), acc: rgbOf(css("--accent")), warm: rgbOf(css("--warm")) }; };
    const mix = (a, b, t) => [0, 1, 2].map((i) => Math.round(a[i] + (b[i] - a[i]) * Math.max(0, Math.min(1, t))));
    function paint(cv, w, h, colorAt) {
      const g = cv.getContext("2d"), im = g.createImageData(w, h);
      for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const c = colorAt(x, y), k = (y * w + x) * 4; im.data[k] = c[0]; im.data[k + 1] = c[1]; im.data[k + 2] = c[2]; im.data[k + 3] = 255; }
      g.putImageData(im, 0, 0);
    }
    const div = (v, m) => (v >= 0 ? mix(C.surf, C.acc, v / m) : mix(C.surf, C.warm, -v / m));

    // ---- drawing pad
    const pad = $("#pad"), pg = pad.getContext("2d", { willReadFrequently: true });
    let base = new Float32Array(784), src = "example", drawing = false, last = null, exI = 0, missI = 0;
    const samples = D.samples.filter((s) => s.miss === undefined), misses = D.samples.filter((s) => s.miss !== undefined);
    function showOnPad(arr) {
      pg.clearRect(0, 0, 280, 280);
      const ink = css("--ink");
      for (let i = 0; i < 784; i++) if (arr[i] > 0.02) { pg.globalAlpha = arr[i]; pg.fillStyle = ink; pg.fillRect((i % 28) * 10, ((i / 28) | 0) * 10, 10, 10); }
      pg.globalAlpha = 1;
    }
    function loadSample(s, note) {
      base = Float32Array.from(hexIn(s.p)); src = "example"; showOnPad(base);
      $("#srcNote").innerHTML = note;
      update();
    }
    function fromPad() {
      const a = pg.getImageData(0, 0, 280, 280).data;
      let x0 = 280, y0 = 280, x1 = -1, y1 = -1;
      for (let y = 0; y < 280; y++) for (let x = 0; x < 280; x++) if (a[(y * 280 + x) * 4 + 3] > 25) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
      base = new Float32Array(784);
      if (x1 < 0) return;
      const bw = x1 - x0 + 1, bh = y1 - y0 + 1, s = 20 / Math.max(bw, bh);
      const t = document.createElement("canvas"); t.width = t.height = 28;
      const tg = t.getContext("2d", { willReadFrequently: true });
      tg.imageSmoothingEnabled = true; tg.imageSmoothingQuality = "high";
      tg.drawImage(pad, x0, y0, bw, bh, 14 - (bw * s) / 2, 14 - (bh * s) / 2, bw * s, bh * s);
      const d = tg.getImageData(0, 0, 28, 28).data, raw = new Float32Array(784);
      let m = 0, cx = 0, cy = 0;
      for (let i = 0; i < 784; i++) { raw[i] = d[i * 4 + 3] / 255; m += raw[i]; cx += raw[i] * (i % 28); cy += raw[i] * ((i / 28) | 0); }
      const dx = Math.round(13.5 - cx / m), dy = Math.round(13.5 - cy / m);
      for (let y = 0; y < 28; y++) for (let x = 0; x < 28; x++) { const sx = x - dx, sy = y - dy; base[y * 28 + x] = sx >= 0 && sx < 28 && sy >= 0 && sy < 28 ? Math.min(1, raw[sy * 28 + sx] * 1.15) : 0; }
    }
    const pos = (e) => { const r = pad.getBoundingClientRect(); return [((e.clientX - r.left) / r.width) * 280, ((e.clientY - r.top) / r.height) * 280]; };
    pad.addEventListener("pointerdown", (e) => {
      if (src !== "drawn") { pg.clearRect(0, 0, 280, 280); src = "drawn"; $("#srcNote").textContent = "Your drawing. Lift and draw again to add strokes."; }
      drawing = true; last = pos(e); pad.setPointerCapture(e.pointerId); stroke(last, last);
    });
    pad.addEventListener("pointermove", (e) => { if (!drawing) return; const p = pos(e); stroke(last, p); last = p; });
    const end = () => { if (!drawing) return; drawing = false; fromPad(); update(); };
    pad.addEventListener("pointerup", end); pad.addEventListener("pointercancel", end);
    function stroke(a, b) { pg.strokeStyle = css("--ink"); pg.lineWidth = 20; pg.lineCap = pg.lineJoin = "round"; pg.beginPath(); pg.moveTo(a[0], a[1]); pg.lineTo(b[0], b[1]); pg.stroke(); }

    // ---- the network
    let N = null, sel = 0, ksrc = "learned", boxAuto = true;
    function input() {
      const sx = +$("#sx").value, sy = +$("#sy").value, nz = +$("#noise").value, x = new Float32Array(784);
      const r = Lab.rng(7);
      for (let y = 0; y < 28; y++) for (let c = 0; c < 28; c++) {
        const ox = c - sx, oy = y - sy;
        let v = ox >= 0 && ox < 28 && oy >= 0 && oy < 28 ? base[oy * 28 + ox] : 0;
        if (nz) v += nz * (r() - 0.5) * 2;
        x[y * 28 + c] = Math.max(0, Math.min(1, v));
      }
      return x;
    }
    const conv = (x, w, b) => { const z = new Float32Array(576); for (let i = 0; i < 24; i++) for (let j = 0; j < 24; j++) { let s = b; for (let u = 0; u < 5; u++) for (let v = 0; v < 5; v++) s += w[u * 5 + v] * x[(i + u) * 28 + j + v]; z[i * 24 + j] = s; } return z; };
    function forward() {
      const x = input(), Z = [], A = [], M = [];
      for (let f = 0; f < F; f++) {
        const z = conv(x, W1.slice(f * 25, f * 25 + 25), b1[f]), a = z.map((v) => Math.max(0, v)), m = new Float32Array(144);
        for (let i = 0; i < 12; i++) for (let j = 0; j < 12; j++) m[i * 12 + j] = Math.max(a[2 * i * 24 + 2 * j], a[2 * i * 24 + 2 * j + 1], a[(2 * i + 1) * 24 + 2 * j], a[(2 * i + 1) * 24 + 2 * j + 1]);
        Z.push(z); A.push(a); M.push(m);
      }
      const score = b2.slice(), contrib = Array.from({ length: F }, () => new Float32Array(10));
      for (let f = 0; f < F; f++) for (let k = 0; k < 144; k++) { const v = M[f][k]; if (!v) continue; const o = (f * 144 + k) * 10; for (let c = 0; c < 10; c++) { const t = v * W2[o + c]; score[c] += t; contrib[f][c] += t; } }
      const mx = Math.max(...score), e = score.map((s) => Math.exp(s - mx)), se = e.reduce((a, b) => a + b, 0), p = e.map((v) => v / se);
      const order = [...p.keys()].sort((a, b) => p[b] - p[a]);
      N = { x, Z, A, M, score, p, order, contrib, empty: base.every((v) => v === 0) };
    }

    // ---- drawing everything
    function drawTop() {
      paint($("#in28"), 28, 28, (x, y) => mix(C.surf, C.ink, N.x[y * 28 + x]));
      const top = N.order[0];
      $("#pred").textContent = N.empty ? "–" : top;
      $("#conf").textContent = N.empty ? "Draw something" : `${(N.p[top] * 100).toFixed(1)}% sure · next: ${N.order[1]} (${(N.p[N.order[1]] * 100).toFixed(1)}%)`;
      $("#probs").innerHTML = N.p.map((v, d) => `<div style="display:grid;grid-template-columns:14px 1fr 52px;gap:8px;align-items:center"><b style="font-weight:${d === top ? 700 : 400}">${d}</b><div style="height:12px;background:var(--grid);border-radius:3px;overflow:hidden"><div style="height:100%;width:${(v * 100).toFixed(1)}%;background:var(${d === top ? "--accent" : "--muted"})"></div></div><span style="text-align:right;color:var(--muted)">${(v * 100).toFixed(1)}%</span></div>`).join("");
    }
    function drawMaps() {
      const box = $("#maps");
      if (!box.children.length) {
        box.innerHTML = Array.from({ length: F }, (_, f) => `<button type="button" data-f="${f}" aria-pressed="${f === sel}" style="all:unset;cursor:pointer;display:grid;gap:4px;padding:4px;border-radius:6px;border:2px solid transparent;min-width:0">
          <span style="font:.7rem/1 var(--font-mono);color:var(--muted);text-align:center">#${f + 1}</span>
          <canvas width="5" height="5" style="${px}"></canvas><canvas width="24" height="24" style="${px}"></canvas><canvas width="12" height="12" style="${px}"></canvas>
          <span class="sc" style="font:.68rem/1 var(--font-mono);color:var(--muted);text-align:center"></span></button>`).join("");
        box.querySelectorAll("button").forEach((b) => b.addEventListener("click", () => { $("#flt").value = +b.dataset.f + 1; setSel(); }));
      }
      const top = N.order[0];
      box.querySelectorAll("button").forEach((b, f) => {
        const cv = b.querySelectorAll("canvas"), w = W1.slice(f * 25, f * 25 + 25), wm = Math.max(...w.map(Math.abs));
        paint(cv[0], 5, 5, (x, y) => div(w[y * 5 + x], wm));
        const am = Math.max(1e-6, ...N.A[f]);
        paint(cv[1], 24, 24, (x, y) => mix(C.surf, C.acc, N.A[f][y * 24 + x] / am));
        paint(cv[2], 12, 12, (x, y) => mix(C.surf, C.acc, N.M[f][y * 12 + x] / am));
        b.style.borderColor = f === sel ? css("--accent") : "transparent";
        b.setAttribute("aria-pressed", String(f === sel));
        const c = N.contrib[f][top];
        b.querySelector(".sc").innerHTML = N.empty ? "" : `<span style="color:var(${c >= 0 ? "--good" : "--bad"})">${c >= 0 ? "+" : "−"}${fmt(Math.abs(c), 1)}</span>`;
      });
    }
    function drawWork() {
      const r = +$("#pr").value, c = +$("#pc").value;
      const K0 = ksrc === "learned" ? { name: `Learned filter #${sel + 1}`, w: W1.slice(sel * 25, sel * 25 + 25), b: b1[sel] } : CLASSIC[ksrc];
      const z = ksrc === "learned" ? N.Z[sel] : conv(N.x, K0.w, K0.b);
      const zm = Math.max(1e-6, ...Array.from(z, Math.abs));
      const big = $("#big");
      paint(big, 24, 24, (x, y) => (x === c && y === r ? C.ink : div(z[y * 24 + x], zm)));
      // patch, weights, products
      const wm = Math.max(...K0.w.map(Math.abs));
      let sum = 0;
      const tbl = (fn) => `<table style="border-collapse:collapse;font:.72rem/1 var(--font-mono);font-variant-numeric:tabular-nums">${[0, 1, 2, 3, 4].map((u) => `<tr>${[0, 1, 2, 3, 4].map((v) => fn(u, v)).join("")}</tr>`).join("")}</table>`;
      const td = (t, bg) => `<td style="padding:4px 5px;text-align:right;border:1px solid var(--grid);background:${bg}">${t}</td>`;
      const rgb = (a) => `rgb(${a.join(",")})`;
      const pT = tbl((u, v) => { const val = N.x[(r + u) * 28 + c + v]; return td(val.toFixed(2), rgb(mix(C.surf, C.ink, val * 0.35))); });
      const wT = tbl((u, v) => td(K0.w[u * 5 + v].toFixed(2), rgb(div(K0.w[u * 5 + v], wm * 2.2))));
      const prods = [];
      for (let u = 0; u < 5; u++) for (let v = 0; v < 5; v++) { const t = N.x[(r + u) * 28 + c + v] * K0.w[u * 5 + v]; sum += t; if (Math.abs(t) > 0.005) prods.push(t); }
      const pre = sum + K0.b, post = Math.max(0, pre);
      const big3 = prods.sort((a, b) => Math.abs(b) - Math.abs(a)).slice(0, 4).map((t) => (t >= 0 ? "+" : "−") + Math.abs(t).toFixed(2)).join(" ");
      let pool = "";
      if (ksrc === "learned") {
        const pi = r >> 1, pj = c >> 1, a = N.A[sel], blk = [a[2 * pi * 24 + 2 * pj], a[2 * pi * 24 + 2 * pj + 1], a[(2 * pi + 1) * 24 + 2 * pj], a[(2 * pi + 1) * 24 + 2 * pj + 1]];
        pool = `<div style="margin-top:8px">Pooling: this cell sits in 2×2 block (${pi}, ${pj}) = [${blk.map((v) => v.toFixed(2)).join(", ")}] → max = <b>${Math.max(...blk).toFixed(2)}</b>, one of the 144 values filter #${sel + 1} passes to the last layer.</div>`;
      } else pool = `<div style="margin-top:8px;color:var(--muted)">${K0.name} is a classic hand-made filter, shown for comparison. The network didn't learn it and doesn't use it, but several learned filters look similar.</div>`;
      $("#work").innerHTML = `<div style="display:flex;flex-wrap:wrap;gap:12px;align-items:flex-start">
          <div><div class="hint" style="margin:0 0 4px">Pixels under the box (row ${r}, col ${c})</div>${pT}</div>
          <div style="align-self:center;font:1.2rem var(--font-mono);color:var(--muted)">×</div>
          <div><div class="hint" style="margin:0 0 4px">${K0.name} weights</div>${wT}</div></div>
        <div style="font:.82rem/1.8 var(--font-mono);margin-top:10px">
          Σ pixel × weight = ${prods.length ? big3 + (prods.length > 4 ? " … (" + prods.length + " non-zero terms)" : "") : "0 (blank area)"} = <b>${sum.toFixed(3)}</b><br>
          + bias ${K0.b >= 0 ? "" : "−"}${Math.abs(K0.b).toFixed(3)} = <b>${pre.toFixed(3)}</b><br>
          ReLU: max(0, ${pre.toFixed(3)}) = <b style="color:var(${post > 0 ? "--accent" : "--muted"})">${post.toFixed(3)}</b> ${post > 0 ? "→ pattern found here" : "→ set to 0"}
          ${pool}</div>`;
    }
    function drawVote() {
      const top = N.order[0], sec = N.order[1];
      if (N.empty) { $("#voteTxt").textContent = "Draw a digit to see the vote."; $("#vote").innerHTML = ""; return; }
      const rows = N.contrib.map((c, f) => ({ f, a: c[top], b: c[sec] }));
      const mx = Math.max(1e-6, ...rows.flatMap((r) => [Math.abs(r.a), Math.abs(r.b)]));
      const best = rows.reduce((a, b) => (b.a > a.a ? b : a)), worst = rows.reduce((a, b) => (b.a < a.a ? b : a));
      $("#voteTxt").innerHTML = `Each digit's score is the sum of every filter's pooled map times that digit's weights. Bars show each filter's share of the score for <b style="color:var(--accent)">${top}</b> (the winner) and <b style="color:var(--muted)">${sec}</b> (runner-up). Filter #${best.f + 1} pushes hardest toward ${top}${worst.a < 0 ? `; #${worst.f + 1} pushes against it` : ""}. Scores: ${top} = ${N.score[top].toFixed(2)}, ${sec} = ${N.score[sec].toFixed(2)}; softmax turns that gap of ${(N.score[top] - N.score[sec]).toFixed(2)} into ${(N.p[top] * 100).toFixed(1)}% vs ${(N.p[sec] * 100).toFixed(1)}%.`;
      const bar = (v, col) => `<div style="position:relative;height:9px"><div style="position:absolute;top:0;bottom:0;${v >= 0 ? "left:50%" : "right:50%"};width:${(Math.abs(v) / mx) * 50}%;background:var(${col});border-radius:2px"></div></div>`;
      $("#vote").innerHTML = `<div style="display:grid;grid-template-columns:30px 1fr 110px;gap:8px;color:var(--muted)"><span></span><span style="display:flex;justify-content:space-between"><span>← against</span><span>for →</span></span><span style="text-align:right">${top} / ${sec}</span></div>` +
        rows.map((r) => `<div style="display:grid;grid-template-columns:30px 1fr 110px;gap:8px;align-items:center;${r.f === sel ? "font-weight:700" : ""}"><span>#${r.f + 1}</span><div style="display:grid;gap:2px;background:linear-gradient(var(--line),var(--line)) center/1px 100% no-repeat">${bar(r.a, "--accent")}${bar(r.b, "--muted")}</div><span style="text-align:right">${r.a >= 0 ? "+" : "−"}${Math.abs(r.a).toFixed(2)} / ${r.b >= 0 ? "+" : "−"}${Math.abs(r.b).toFixed(2)}</span></div>`).join("") +
        `<div style="display:grid;grid-template-columns:30px 1fr 110px;gap:8px;color:var(--muted)"><span>bias</span><span></span><span style="text-align:right">${b2[top].toFixed(2)} / ${b2[sec].toFixed(2)}</span></div>`;
    }
    function drawCM() {
      const M = D.confusion, mx = Math.max(...M.flatMap((r, i) => r.filter((_, j) => j !== i)));
      const th = (t) => `<th style="padding:5px 6px;color:var(--muted);font-weight:500">${t}</th>`;
      $("#cm").innerHTML = `<tr>${th("true ↓ / said →")}${M.map((_, j) => th(j)).join("")}${th("correct")}</tr>` + M.map((r, i) => `<tr>${th(i)}${r.map((v, j) => {
        const bg = i === j ? "var(--accent-soft)" : v ? `color-mix(in srgb, var(--bad) ${Math.round(12 + (v / mx) * 50)}%, transparent)` : "transparent";
        return `<td style="padding:5px 6px;text-align:right;border:1px solid var(--grid);background:${bg};${i === j ? "font-weight:700" : v ? "" : "color:var(--grid)"}">${v}</td>`;
      }).join("")}<td style="padding:5px 6px;text-align:right">${((r[i] / r.reduce((a, b) => a + b, 0)) * 100).toFixed(0)}%</td></tr>`).join("");
    }
    function readouts() {
      const top = N.order[0];
      $("#ro").innerHTML = `<div class="ro"><b>Prediction</b><span class="pill ${N.empty ? "idle" : N.p[top] > 0.8 ? "ok" : "warn"}">${N.empty ? "–" : top + " · " + (N.p[top] * 100).toFixed(0) + "%"}</span></div>
        <div class="ro"><b>Runner-up</b><span class="num">${N.empty ? "–" : N.order[1] + " · " + (N.p[N.order[1]] * 100).toFixed(1) + "%"}</span></div>
        <div class="ro"><b>Filter #${sel + 1} total activation</b><span class="num">${fmt(N.A[sel].reduce((a, b) => a + b, 0), 1)}</span></div>
        <div class="ro"><b>Weights in the model</b><span class="num">11,738</span></div>`;
    }
    function labels() {
      $("#fltV").textContent = "#" + $("#flt").value; $("#prV").textContent = $("#pr").value; $("#pcV").textContent = $("#pc").value;
      $("#sxV").textContent = (+$("#sx").value > 0 ? "+" : "") + $("#sx").value + " px"; $("#syV").textContent = (+$("#sy").value > 0 ? "+" : "") + $("#sy").value + " px"; $("#noiseV").textContent = (+$("#noise").value).toFixed(2);
    }
    function autoBox() {
      if (!boxAuto || !N) return;
      const z = N.Z[sel]; let k = 0; for (let i = 1; i < 576; i++) if (z[i] > z[k]) k = i;
      $("#pr").value = (k / 24) | 0; $("#pc").value = k % 24; labels();
    }
    function render() { autoBox(); drawTop(); drawMaps(); drawWork(); drawVote(); readouts(); }
    function update() { labels(); forward(); render(); }
    function setSel() { sel = +$("#flt").value - 1; if (ksrc !== "learned") setK("learned"); labels(); render(); }
    function setK(v) { ksrc = v; $("#ksrc").querySelectorAll("button").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.v === v))); }

    $("#flt").addEventListener("input", setSel);
    ["#pr", "#pc"].forEach((s) => $(s).addEventListener("input", () => { boxAuto = false; labels(); drawWork(); }));
    ["#sx", "#sy", "#noise"].forEach((s) => $(s).addEventListener("input", update));
    $("#ksrc").querySelectorAll("button").forEach((b) => b.addEventListener("click", () => { setK(b.dataset.v); drawWork(); }));
    $("#big").addEventListener("click", (e) => { const r = $("#big").getBoundingClientRect(); boxAuto = false; $("#pc").value = Math.min(23, Math.floor(((e.clientX - r.left) / r.width) * 24)); $("#pr").value = Math.min(23, Math.floor(((e.clientY - r.top) / r.height) * 24)); labels(); drawWork(); });
    $("#clear").addEventListener("click", () => { pg.clearRect(0, 0, 280, 280); base = new Float32Array(784); src = "drawn"; $("#srcNote").textContent = "Draw a digit in the box."; update(); });
    $("#ex").addEventListener("click", () => { exI = (exI + 1) % samples.length; const s = samples[(exI * 7) % samples.length]; loadSample(s, `A held-out MNIST ${s.y}, never seen in training.`); });
    $("#miss").addEventListener("click", () => { const s = misses[missI++ % misses.length]; loadSample(s, `A held-out MNIST digit labelled <b>${s.y}</b> that the network reads as ${s.miss}.`); });
    $("#reset").addEventListener("click", () => { root.querySelectorAll("input[type=range]").forEach((e) => (e.value = e.defaultValue)); sel = 0; boxAuto = true; setK("learned"); exI = 0; loadSample(samples[0], `A held-out MNIST ${samples[0].y}, never seen in training.`); });

    theme(); drawCM();
    loadSample(samples[(0 * 7) % samples.length], `A held-out MNIST ${samples[0].y}, never seen in training. Draw your own over it.`);
    return watch([], () => { theme(); if (src === "example") showOnPad(base); render(); drawCM(); });
  },
});
