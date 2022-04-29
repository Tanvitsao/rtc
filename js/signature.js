
/**
 * 簽名版外層的 card
 */
const signCard = document.getElementById('signCard');

/**
 * 簽名版
 */
const signPad = document.getElementById('signPad');

/**
 * 是否正在畫
 */
let isDrawing = false;

/**
 * 內容
 */
let context;


/**
 * 初始化 canvas
 */
function initCanvas() {
    context = signPad.getContext('2d');
    console.log(context);
    context.strokeStyle = '#333333';
    setTimeout(() => {
        onResize();
    }, 300);
}

/**
 * 依卡片寬高設定 canvas 大小
 * @param width 卡片寬
 * @param height 卡片高
 */
function setCanvasSize(width, height) {
    signPad.width = width;
    signPad.height = height;
}

function relativeCoords(event) {
    const bounds = event.target.getBoundingClientRect();
    let x = 0;
    let y = 0;

    // 手機
    if (event.touches) {
        x = event.touches[0].clientX - bounds.left;
        y = event.touches[0].clientY - bounds.top;
    } else {
        // PC
        x = event.clientX - bounds.left;
        y = event.clientY - bounds.top;
    }
    return { x, y };
}

function onResize() {
    console.log(signCard.clientWidth, signCard.offsetWidth, signCard.offsetHeight);
    setTimeout(() => {
        setCanvasSize(signCard.offsetWidth, signCard.offsetHeight);
    });
}

function onMouseUp(e) {
    isDrawing = false;
}

function onMouseDown(e) {
    e.preventDefault();
    e.stopPropagation();

    isDrawing = true;
    const coords = relativeCoords(e);
    context.lineWidth = 6; // 字體粗細
    context.moveTo(coords.x, coords.y);
    isSign = true;
}

function onMouseMove(e) {
    e.preventDefault();
    e.stopPropagation();

    if (isDrawing) {
        const coords = relativeCoords(e);
        context.lineTo(coords.x, coords.y);
        context.stroke();
    }
}

/**
 * 清除畫板
 */
function clearCanvas() {
    context.clearRect(0, 0, signPad.width, signPad.height);
    context.beginPath();
    isSign = false;
}

/**
 * 儲存簽名
 */
function saveCanvas() {
    // signPad.toBlob((blob) => {
    //   pdfService.sign = file;
    // });

    const imgData = signPad.toDataURL();
    const blobBin = atob(imgData.split(',')[1]);
    const array = [];
    for (let i = 0; i < blobBin.length; i++) {
        array.push(blobBin.charCodeAt(i));
    }
    const file = new Blob([new Uint8Array(array)], { type: 'png' });
    return file;
}
