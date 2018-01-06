// This file is required by the index.html file and will
// be executed in the renderer process for that window.
// All of the Node.js APIs are available in this process.
const { spawn, exec } = require('child_process');
const path = require('path');
const fs = require('fs');
let logDom = document.getElementById("log");
function log(msg) {
    logDom.innerHTML = msg + "<br/>" + logDom.innerHTML;
}

let pic_index = 0;
let ctx1 = document.getElementById("canvas1").getContext("2d");
let ctx2 = document.getElementById("canvas2").getContext("2d");
function renderPicture() {
    const adb_screenshot = spawn('adb', ['shell', '/system/bin/screencap', '-p', '/sdcard/screenshot.png']);
    adb_screenshot.stdout.on('data', (data) => {
        //log(`stdout: ${data}`);
    });
    adb_screenshot.stderr.on('data', (data) => {
        //log(`stderr: ${data}`);
    });
    adb_screenshot.on('close', (code) => {
        //log(`child process exited with code ${code}`);
        if (code == 0) {
            let oldImg = path.join(__dirname, "screenshot", pic_index + ".png");
            if (fs.existsSync(oldImg)) {
                fs.unlinkSync(oldImg)
            }
            pic_index++;
            const adb_pull = spawn('adb', ['pull', '/sdcard/screenshot.png', path.join(__dirname, "screenshot", pic_index + ".png")]);
            adb_pull.stdout.on('data', (data) => {
                //log(`stdout: ${data}`);
            });
            adb_pull.stderr.on('data', (data) => {
                //log(`stderr: ${data}`);
            });
            adb_pull.on('close', (code) => {
                //log(`child process exited with code ${code}`);
                if (code == 0) {
                    var img = new Image();
                    img.src = "./screenshot/" + pic_index + ".png";
                    img.onload = function () {
                        let w = 200, h = 400;
                        ctx1.drawImage(img, 0, 0, w, h);
                        let imageData = ctx1.getImageData(0, 0, w, h);
                        let data = imageData.data;
                        let startPoint = {
                            x: 0,
                            y: h * 0.2
                        };
                        let endPoint = {
                            x: w,
                            y: h * 0.8
                        }
                        let startIndex = w * 4 * startPoint.y;
                        let endIndex = w * 4 * endPoint.y;
                        var compare_rgb = {
                            r: data[startIndex],
                            g: data[startIndex + 1],
                            b: data[startIndex + 2]
                        }
                        let targetColorTop = null;
                        let targetColorRight = null;
                        let targetPointTop = null;
                        let targetPointRight = null;
                        let start = null;
                        let startColor = { r: 54, g: 60, b: 102 };
                        for (var i = startIndex; i < endIndex; i += 4) {
                            let rgb = {
                                r: data[i],
                                g: data[i + 1],
                                b: data[i + 2]
                            }
                            let currentPoint = getPoint(i, w, h);
                            if (isSame(startColor, rgb)) {
                                start = currentPoint;
                                data[i] = 255;
                                data[i + 1] = 0;
                                data[i + 2] = 0;
                            }

                            if (targetColorTop && getColorDistance(targetColorTop, rgb) < 8 && targetPointRight.x < currentPoint.x) {
                                //log("相同啊");
                                targetPointRight = currentPoint;
                                data[i] = 255;
                                data[i + 1] = 0;
                                data[i + 2] = 0;
                            }

                            if (getColorDistance(compare_rgb, rgb) < 10) {
                                //找到最上面的
                                compare_rgb = rgb;
                                // data[i] = 0;
                                // data[i + 1] = 255;
                                // data[i + 2] = 0;
                            } else if (!targetColorTop) {
                                //找到目标点的最上面
                                targetColorTop = Object.assign(rgb);
                                targetPointTop = currentPoint;
                                targetPointRight = currentPoint;
                                data[i] = 255;
                                data[i + 1] = 0;
                                data[i + 2] = 0;
                            }
                            // data[i] = 255 - data[i];
                            // data[i + 1] = 255 - data[i + 1];
                            // data[i + 2] = 255 - data[i + 2];
                        }

                        ctx2.putImageData(imageData, 0, 0);
                        let distance = getPointDistance(targetPointTop, targetPointRight, start);
                        console.log("distance", distance);


                        //adb shell input swipe <x1> <y1> <x2> <y2> [duration(ms)]
                        const touch = spawn('adb', ('shell input touchscreen swipe 170 187 170 187 ' + parseInt(distance * 7.5)).split(' '));
                        touch.stdout.on('data', (data) => {
                            console.log('touch stdout');
                        });
                        touch.stderr.on('data', (data) => {
                            console.log('touch stderr');
                        });
                        touch.on('close', (code) => {
                            console.log('touch close', code);
                        })
                    }
                }
            });
        }
    });
}

//获取距离
function getPointDistance(topPoint, rightPoint, personPoint) {
    let targetPoint = {
        x: topPoint.x,
        y: rightPoint.y
    }
    return Math.sqrt(Math.pow((targetPoint.x - personPoint.x), 2) + Math.pow((targetPoint.y - personPoint.y), 2));
}

function getPoint(i, w, h) {
    let x = i / 4 % w - 1;
    return {
        x: x,
        y: Math.floor(i / 4 / w)
    }
}

function isSame(color1, color2) {
    return color1.r == color2.r && color1.g == color2.g && color1.b == color2.b;
}

function getColorDistance(color1, color2) {
    return Math.sqrt(Math.pow((color1.r - color2.r), 2) + Math.pow((color1.g - color2.g), 2) + Math.pow((color1.b - color2.b), 2))
}

setInterval(renderPicture, 5000);