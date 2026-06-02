// Utilitas Jaringan Saraf Tiruan & Matematika
function lerp(A, B, t) {
    return A + (B - A) * t;
}

class NeuralNetwork {
    constructor(neuronCounts) {
        this.levels = [];
        for (let i = 0; i < neuronCounts.length - 1; i++) {
            this.levels.push(new Level(neuronCounts[i], neuronCounts[i + 1]));
        }
    }

    static feedForward(givenInputs, network) {
        let outputs = Level.feedForward(givenInputs, network.levels[0]);
        for (let i = 1; i < network.levels.length; i++) {
            outputs = Level.feedForward(outputs, network.levels[i]);
        }
        return outputs;
    }

    static mutate(network, amount = 0.1) {
        network.levels.forEach(level => {
            for (let i = 0; i < level.biases.length; i++) {
                level.biases[i] = lerp(level.biases[i], Math.random() * 2 - 1, amount);
            }
            for (let i = 0; i < level.weights.length; i++) {
                for (let j = 0; j < level.weights[i].length; j++) {
                    level.weights[i][j] = lerp(level.weights[i][j], Math.random() * 2 - 1, amount);
                }
            }
        });
    }

    static clone(network) {
        let cloned = new NeuralNetwork([1, 1]); // dummy layer
        cloned.levels = network.levels.map(level => {
            let newLevel = new Level(level.inputs.length, level.outputs.length);
            for (let i = 0; i < level.weights.length; i++) {
                newLevel.weights[i] = [...level.weights[i]];
            }
            newLevel.biases = [...level.biases];
            return newLevel;
        });
        return cloned;
    }

    // Untuk parsing ulang setelah di-load dari LocalStorage
    static deserialize(data) {
        let nn = new NeuralNetwork([1, 1]); // dummy
        nn.levels = data.levels.map(levelData => {
            let level = new Level(levelData.inputs.length, levelData.outputs.length);
            level.biases = [...levelData.biases];
            for (let i = 0; i < levelData.weights.length; i++) {
                level.weights[i] = [...levelData.weights[i]];
            }
            return level;
        });
        return nn;
    }
}

class Level {
    constructor(inputCount, outputCount) {
        this.inputs = new Array(inputCount).fill(0);
        this.outputs = new Array(outputCount).fill(0);
        this.biases = new Array(outputCount).fill(0);
        this.weights = [];
        for (let i = 0; i < inputCount; i++) {
            this.weights[i] = new Array(outputCount).fill(0);
        }
        Level.#randomize(this);
    }

    static #randomize(level) {
        for (let i = 0; i < level.inputs.length; i++) {
            for (let j = 0; j < level.outputs.length; j++) {
                level.weights[i][j] = Math.random() * 2 - 1;
            }
        }
        for (let i = 0; i < level.biases.length; i++) {
            level.biases[i] = Math.random() * 2 - 1;
        }
    }

    static feedForward(givenInputs, level) {
        for (let i = 0; i < level.inputs.length; i++) {
            level.inputs[i] = givenInputs[i];
        }
        for (let i = 0; i < level.outputs.length; i++) {
            let sum = 0;
            for (let j = 0; j < level.inputs.length; j++) {
                sum += level.inputs[j] * level.weights[j][i];
            }
            sum += level.biases[i];
            level.outputs[i] = Math.tanh(sum);
        }
        return level.outputs;
    }
}

// Raycasting / Geometry
function getIntersection(A, B, C, D) {
    const tTop = (D.x - C.x) * (A.y - C.y) - (D.y - C.y) * (A.x - C.x);
    const uTop = (C.y - A.y) * (A.x - B.x) - (C.x - A.x) * (A.y - B.y);
    const bottom = (D.y - C.y) * (B.x - A.x) - (D.x - C.x) * (B.y - A.y);

    if (bottom !== 0) {
        const t = tTop / bottom;
        const u = uTop / bottom;
        if (t >= 0 && t <= 1 && u >= 0 && u <= 1) {
            return {
                x: lerp(A.x, B.x, t),
                y: lerp(A.y, B.y, t),
                offset: t
            };
        }
    }
    return null;
}

function distToSegmentSquared(p, v, w) {
    let l2 = Math.pow(v.x - w.x, 2) + Math.pow(v.y - w.y, 2);
    if (l2 === 0) return Math.pow(p.x - v.x, 2) + Math.pow(p.y - v.y, 2);
    let t = ((p.x - v.x) * (w.x - v.x) + (p.y - v.y) * (w.y - v.y)) / l2;
    t = Math.max(0, Math.min(1, t));
    return Math.pow(p.x - (v.x + t * (w.x - v.x)), 2) + Math.pow(p.y - (v.y + t * (w.y - v.y)), 2);
}

// Particle System
class Particle {
    constructor(x, y, color, speed) {
        this.x = x;
        this.y = y;
        this.vx = (Math.random() - 0.5) * speed;
        this.vy = (Math.random() - 0.5) * speed;
        this.life = 1;
        this.color = color;
    }
    update() {
        this.x += this.vx;
        this.y += this.vy;
        this.life -= 0.025;
    }
    draw(ctx) {
        if(this.life <= 0) return;
        ctx.globalAlpha = this.life;
        ctx.fillStyle = this.color;
        ctx.shadowBlur = 5;
        ctx.shadowColor = this.color;
        ctx.beginPath();
        ctx.arc(this.x, this.y, Math.random() * 2 + 1, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
        ctx.shadowBlur = 0;
    }
}
let particles = [];

// Drone (Agen) Class
class Drone {
    constructor(x, y, brain) {
        this.x = x;
        this.y = y;
        this.angle = 0; 
        this.speed = 5;
        this.radius = 10;
        this.sensorRange = 180;
        this.rayAngles = [-Math.PI / 2, -Math.PI / 4, 0, Math.PI / 4, Math.PI / 2];

        if (brain) {
            this.brain = brain;
        } else {
            // 7 inputs, 12 hidden, 1 output (turn)
            this.brain = new NeuralNetwork([7, 12, 1]); 
        }

        this.alive = true;
        this.fitness = 0;
        this.timeAlive = 0;
        this.reachedTarget = false;
        this.sensorReadings = new Array(this.rayAngles.length).fill(1);
        this.prob = 0;
        this.path = []; 
    }

    update(walls, target) {
        if (!this.alive) return;

        this.timeAlive++;

        if(frames % 4 === 0) {
            this.path.push({x: this.x, y: this.y});
            if(this.path.length > 50) this.path.shift();
        }

        // Membaca Sensor (Raycasting)
        this.sensorReadings = [];
        for (let i = 0; i < this.rayAngles.length; i++) {
            let rayAngle = this.angle + this.rayAngles[i];
            let endX = this.x + Math.cos(rayAngle) * this.sensorRange;
            let endY = this.y + Math.sin(rayAngle) * this.sensorRange;

            let minOffset = 1;
            for (let w of walls) {
                let intersect = getIntersection({ x: this.x, y: this.y }, { x: endX, y: endY }, w.A, w.B);
                if (intersect && intersect.offset < minOffset) {
                    minOffset = intersect.offset;
                }
            }
            this.sensorReadings.push(minOffset);
        }

        let dx = target.x - this.x;
        let dy = target.y - this.y;
        let distToTarget = Math.hypot(dx, dy);
        let angleToTarget = Math.atan2(dy, dx);

        let diffAngle = angleToTarget - this.angle;
        while (diffAngle > Math.PI) diffAngle -= Math.PI * 2;
        while (diffAngle < -Math.PI) diffAngle += Math.PI * 2;

        if (distToTarget < target.radius + this.radius) {
            this.reachedTarget = true;
            this.alive = false;
            successCount++;
            this.calculateFitness(target, initialDist);
            // Spawn partikel ungu/cyan saat sukses
            for(let i=0; i<40; i++) particles.push(new Particle(this.x, this.y, '#00f0ff', 8));
        }

        let inputs = [
            ...this.sensorReadings,
            diffAngle / Math.PI,
            Math.min(distToTarget / 1000, 1) 
        ];

        let outputs = NeuralNetwork.feedForward(inputs, this.brain);
        
        this.angle += outputs[0] * 0.25;

        let nextX = this.x + Math.cos(this.angle) * this.speed;
        let nextY = this.y + Math.sin(this.angle) * this.speed;

        for (let w of walls) {
            if (distToSegmentSquared({ x: nextX, y: nextY }, w.A, w.B) < this.radius * this.radius) {
                this.alive = false;
                this.calculateFitness(target, initialDist);
                // Partikel magenta saat menabrak
                for(let i=0; i<20; i++) particles.push(new Particle(this.x, this.y, '#ff007f', 5));
                break;
            }
        }

        if (this.alive) {
            this.x = nextX;
            this.y = nextY;
        }
    }

    calculateFitness(target, initialDist) {
        let dist = Math.hypot(target.x - this.x, target.y - this.y);
        this.fitness = Math.pow(initialDist / Math.max(1, dist), 2);

        if (this.reachedTarget) {
            this.fitness *= 15; 
            this.fitness += 15000 / this.timeAlive; 
        }
    }

    draw(ctx, isBest) {
        ctx.save();
        
        // Gambar jejak (trail)
        if(isBest && this.path.length > 1) {
            ctx.beginPath();
            ctx.moveTo(this.path[0].x, this.path[0].y);
            for(let i=1; i<this.path.length; i++) {
                ctx.lineTo(this.path[i].x, this.path[i].y);
            }
            ctx.strokeStyle = 'rgba(162, 89, 255, 0.8)';
            ctx.lineWidth = 3;
            ctx.shadowBlur = 10;
            ctx.shadowColor = '#a259ff';
            ctx.stroke();
            ctx.shadowBlur = 0;
        }

        ctx.translate(this.x, this.y);
        ctx.rotate(this.angle);

        // Gambar sensor
        if (isBest) {
            for (let i = 0; i < this.rayAngles.length; i++) {
                let reading = this.sensorReadings[i] || 1;
                ctx.beginPath();
                ctx.moveTo(0, 0);
                ctx.lineTo(Math.cos(this.rayAngles[i]) * this.sensorRange * reading,
                    Math.sin(this.rayAngles[i]) * this.sensorRange * reading);
                ctx.strokeStyle = 'rgba(162, 89, 255, 0.3)';
                ctx.lineWidth = 1;
                ctx.stroke();
            }
        }

        // Bentuk Drone
        ctx.beginPath();
        ctx.moveTo(this.radius * 1.5, 0); 
        ctx.lineTo(-this.radius, -this.radius); 
        ctx.lineTo(-this.radius * 0.4, 0); 
        ctx.lineTo(-this.radius, this.radius); 
        ctx.closePath();

        if (isBest) {
            ctx.fillStyle = '#a259ff';
            ctx.shadowBlur = 20;
            ctx.shadowColor = '#a259ff';
        } else {
            ctx.fillStyle = 'rgba(162, 89, 255, 0.15)';
            ctx.strokeStyle = 'rgba(162, 89, 255, 0.3)';
            ctx.lineWidth = 1;
            ctx.stroke();
        }
        ctx.fill();

        ctx.restore();
    }
}

// Variabel Global Challenge
let isTargetMoving = false;
let mutationRates = [0.01, 0.05, 0.15, 0.30, 0.60];
let mutationIndex = 2; 
let mazeLevel = 0;
const mazeNames = ["Kosong", "Tembok Tengah", "Terowongan", "Zig-Zag", "Ruang Terkunci"];

let simCanvas, nnCanvas, graphCanvas;
let popSize = 150;
let drones = [];
let savedDrones = [];
let generation = 1;
let mutationRate = 0.15;
let fitnessHistory = [];

let startX, startY;
let target = { x: 0, y: 0, radius: 25, isDragging: false };
let initialDist = 0;
let walls = [];
let isDrawing = false;
let currentWall = null;

let animationId;
let frames = 0;
let maxFrames = 800;
let simSpeed = 1;

let allTimeMaxFit = 0;
let successCount = 0;
let currentMaxFit = 0;

// Inisialisasi
window.onload = () => {
    simCanvas = document.getElementById('sim-canvas');
    nnCanvas = document.getElementById('nn-canvas');
    graphCanvas = document.getElementById('graph-canvas');

    resizeCanvases();
    initSim();
    
    for(let i = 0; i < popSize; i++){
        drones.push(new Drone(startX, startY));
    }

    setupEvents();
    setupTabs();
    animate();
};

function resizeCanvases() {
    [simCanvas, nnCanvas, graphCanvas].forEach(canvas => {
        if(canvas && canvas.parentElement.clientWidth > 0) {
            canvas.width = canvas.parentElement.clientWidth;
            canvas.height = canvas.parentElement.clientHeight;
        }
    });
}

window.addEventListener('resize', () => {
    resizeCanvases();
    loadMaze(mazeLevel); 
});

// Sistem Navigasi Tabs
function setupTabs() {
    const tabs = document.querySelectorAll('.tab-btn');
    const panes = document.querySelectorAll('.tab-pane');

    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            tabs.forEach(t => t.classList.remove('active'));
            panes.forEach(p => p.classList.remove('active'));
            
            tab.classList.add('active');
            const targetPane = document.getElementById('tab-' + tab.dataset.tab);
            targetPane.classList.add('active');
            
            // Re-render canvas ukuran saat tab canvas terbuka (agar tidak error width=0)
            if(tab.dataset.tab === 'brain' || tab.dataset.tab === 'graph') {
                setTimeout(resizeCanvases, 50);
            }
        });
    });
}

function initSim() {
    startX = 100;
    startY = simCanvas.height / 2;
    
    if(target.x === 0 && target.y === 0) {
        target.x = simCanvas.width - 100;
        target.y = simCanvas.height / 2;
    }
    initialDist = Math.hypot(target.x - startX, target.y - startY);
    loadMaze(mazeLevel);
}

function loadMaze(level) {
    let w = simCanvas.width;
    let h = simCanvas.height;
    
    walls = [];
    walls.push({ A: { x: 0, y: 0 }, B: { x: w, y: 0 } });
    walls.push({ A: { x: w, y: 0 }, B: { x: w, y: h } });
    walls.push({ A: { x: w, y: h }, B: { x: 0, y: h } });
    walls.push({ A: { x: 0, y: h }, B: { x: 0, y: 0 } });

    if (level === 1) { // Tembok Tengah
        walls.push({ A: { x: w*0.5, y: h*0.2 }, B: { x: w*0.5, y: h*0.8 } });
    } 
    else if (level === 2) { // Terowongan
        walls.push({ A: { x: w*0.35, y: 0 }, B: { x: w*0.35, y: h*0.65 } });
        walls.push({ A: { x: w*0.65, y: h*0.35 }, B: { x: w*0.65, y: h } });
    }
    else if (level === 3) { // Zig-Zag
        walls.push({ A: { x: w*0.25, y: 0 }, B: { x: w*0.25, y: h*0.7 } });
        walls.push({ A: { x: w*0.5, y: h*0.3 }, B: { x: w*0.5, y: h } });
        walls.push({ A: { x: w*0.75, y: 0 }, B: { x: w*0.75, y: h*0.7 } });
    }
    else if (level === 4) { // Ruang Terkunci (U-Shape)
        walls.push({ A: { x: w*0.85, y: h*0.25 }, B: { x: w*0.85, y: h*0.75 } }); 
        walls.push({ A: { x: w*0.65, y: h*0.25 }, B: { x: w*0.85, y: h*0.25 } }); 
        walls.push({ A: { x: w*0.65, y: h*0.75 }, B: { x: w*0.85, y: h*0.75 } }); 
        walls.push({ A: { x: w*0.45, y: h*0.45 }, B: { x: w*0.45, y: h*0.55 } }); 
    }
}

function resetEvolution(baseBrain = null) {
    generation = 1;
    fitnessHistory = [];
    frames = 0;
    allTimeMaxFit = 0;
    successCount = 0;
    currentMaxFit = 0;
    particles = [];
    drones = [];
    
    for(let i = 0; i < popSize; i++){
        if(baseBrain) {
            let cloned = NeuralNetwork.clone(baseBrain);
            // Agen 0 tetap murni, yang lain sedikit dimutasi agar tidak stuck
            if(i > 0) NeuralNetwork.mutate(cloned, mutationRate);
            drones.push(new Drone(startX, startY, cloned));
        } else {
            drones.push(new Drone(startX, startY));
        }
    }
}

function setupEvents() {
    simCanvas.addEventListener('mousedown', e => {
        let rect = simCanvas.getBoundingClientRect();
        let x = e.clientX - rect.left;
        let y = e.clientY - rect.top;

        if (Math.hypot(target.x - x, target.y - y) < target.radius * 1.5) {
            target.isDragging = true;
        } else {
            isDrawing = true;
            currentWall = { A: { x, y }, B: { x, y } };
            walls.push(currentWall);
        }
    });

    simCanvas.addEventListener('mousemove', e => {
        let rect = simCanvas.getBoundingClientRect();
        let x = e.clientX - rect.left;
        let y = e.clientY - rect.top;

        if (target.isDragging) {
            target.x = x;
            target.y = y;
            initialDist = Math.hypot(target.x - startX, target.y - startY);
        } else if (isDrawing && currentWall) {
            currentWall.B = { x, y };
        }
    });

    window.addEventListener('mouseup', () => {
        isDrawing = false;
        currentWall = null;
        target.isDragging = false;
    });

    document.getElementById('btn-clear-walls').addEventListener('click', () => {
        mazeLevel = 0;
        document.getElementById('btn-maze').innerText = `Labirin: ${mazeNames[mazeLevel]}`;
        loadMaze(mazeLevel);
    });

    document.getElementById('btn-reset').addEventListener('click', () => {
        resetEvolution();
    });

    document.getElementById('btn-speed').addEventListener('click', (e) => {
        simSpeed = simSpeed === 1 ? 5 : (simSpeed === 5 ? 10 : 1);
        e.target.innerText = `Kecepatan: ${simSpeed}x`;
    });

    document.getElementById('btn-target-move').addEventListener('click', (e) => {
        isTargetMoving = !isTargetMoving;
        e.target.innerText = `Target Bergerak: ${isTargetMoving ? 'ON' : 'OFF'}`;
        if(isTargetMoving) e.target.classList.add('active-btn');
        else e.target.classList.remove('active-btn');
    });

    document.getElementById('btn-maze').addEventListener('click', (e) => {
        mazeLevel = (mazeLevel + 1) % mazeNames.length;
        e.target.innerText = `Labirin: ${mazeNames[mazeLevel]}`;
        loadMaze(mazeLevel);
        resetEvolution(); 
    });

    document.getElementById('btn-mutation').addEventListener('click', (e) => {
        mutationIndex = (mutationIndex + 1) % mutationRates.length;
        mutationRate = mutationRates[mutationIndex];
        e.target.innerText = `Mutasi: ${Math.round(mutationRate * 100)}%`;
    });

    // Manajemen AI Controls
    document.getElementById('btn-save').addEventListener('click', () => {
        let best = getBestDrone();
        if(!best && savedDrones.length > 0) best = savedDrones.reduce((a, b) => a.fitness > b.fitness ? a : b);
        if(best) {
            localStorage.setItem('neuroevo_best_brain', JSON.stringify(best.brain));
            alert("💾 Jaringan Saraf AI Terbaik berhasil disimpan ke sistem!");
        }
    });

    document.getElementById('btn-load').addEventListener('click', () => {
        let brainStr = localStorage.getItem('neuroevo_best_brain');
        if(brainStr) {
            let loadedBrain = NeuralNetwork.deserialize(JSON.parse(brainStr));
            resetEvolution(loadedBrain);
            alert("✅ Otak AI berhasi dimuat! Generasi 1 kini memiliki kecerdasan dari data yang disimpan.");
        } else {
            alert("❌ Tidak ada data AI yang tersimpan.");
        }
    });

    document.getElementById('btn-kill').addEventListener('click', () => {
        let activeDrones = drones.filter(d => d.alive);
        activeDrones.forEach(d => d.calculateFitness(target, initialDist));
        activeDrones.sort((a, b) => b.fitness - a.fitness);
        
        let half = Math.floor(activeDrones.length / 2);
        let killedCount = 0;
        for (let i = half; i < activeDrones.length; i++) {
            activeDrones[i].alive = false;
            for(let p=0; p<10; p++) particles.push(new Particle(activeDrones[i].x, activeDrones[i].y, '#ff007f', 4));
            killedCount++;
        }
        if(killedCount > 0) alert(`☠️ Eksekusi Massal: ${killedCount} agen berkinerja terburuk dihentikan!`);
    });
}

function getBestDrone() {
    let best = drones[0];
    for (let drone of drones) {
        if (drone.alive) {
            let dt1 = Math.hypot(best.x - target.x, best.y - target.y);
            let dt2 = Math.hypot(drone.x - target.x, drone.y - target.y);
            if (!best.alive || dt2 < dt1) best = drone;
        }
    }
    return best;
}

function nextGeneration() {
    calculateAllFitness();
    drones = generateNextPopulation();
    savedDrones = [];
    generation++;
    frames = 0;
    successCount = 0;
    particles = [];
}

function calculateAllFitness() {
    let sum = 0;
    currentMaxFit = 0;
    for (let drone of savedDrones) {
        sum += drone.fitness;
        if(drone.fitness > currentMaxFit) currentMaxFit = drone.fitness;
    }
    let avg = sum / savedDrones.length;
    if(currentMaxFit > allTimeMaxFit) allTimeMaxFit = currentMaxFit;
    fitnessHistory.push({ gen: generation, max: currentMaxFit, avg: avg });
    for (let drone of savedDrones) drone.prob = drone.fitness / sum;
}

function pickOne() {
    let index = 0;
    let r = Math.random();
    while (r > 0 && index < savedDrones.length) {
        r -= savedDrones[index].prob;
        index++;
    }
    index--;
    if(index < 0) index = 0;
    if(index >= savedDrones.length) index = savedDrones.length - 1;
    
    let drone = savedDrones[index];
    let childBrain = NeuralNetwork.clone(drone.brain);
    NeuralNetwork.mutate(childBrain, mutationRate);
    return new Drone(startX, startY, childBrain);
}

function generateNextPopulation() {
    let newDrones = [];
    let bestDrone = savedDrones.reduce((a, b) => a.fitness > b.fitness ? a : b);
    newDrones.push(new Drone(startX, startY, NeuralNetwork.clone(bestDrone.brain)));

    for (let i = 1; i < popSize; i++) {
        newDrones.push(pickOne());
    }
    return newDrones;
}

// Menggambar Jaringan Saraf
function drawNetwork(ctx, network) {
    if(!ctx) return;
    let margin = 35;
    let width = ctx.canvas.width;
    let height = ctx.canvas.height;
    if(width === 0 || height === 0) return;

    ctx.clearRect(0, 0, width, height);

    let levelHeight = (height - 2 * margin) / network.levels.length;

    for (let i = 0; i < network.levels.length; i++) {
        let level = network.levels[i];
        let yBottom = height - margin - i * levelHeight;
        let yTop = height - margin - (i + 1) * levelHeight;

        let getX = (index, length) => {
            if (length === 1) return width / 2;
            return margin + (index / (length - 1)) * (width - 2 * margin);
        };

        for (let j = 0; j < level.inputs.length; j++) {
            for (let k = 0; k < level.outputs.length; k++) {
                ctx.beginPath();
                ctx.moveTo(getX(j, level.inputs.length), yBottom);
                ctx.lineTo(getX(k, level.outputs.length), yTop);
                let weight = level.weights[j][k];
                ctx.lineWidth = Math.min(Math.abs(weight) * 2, 3);
                ctx.strokeStyle = weight > 0 ? 'rgba(162, 89, 255, 0.5)' : 'rgba(255, 0, 127, 0.4)';
                ctx.stroke();
            }
        }

        let drawNode = (x, y, act) => {
            ctx.beginPath();
            ctx.arc(x, y, 12, 0, Math.PI * 2);
            ctx.fillStyle = '#0a0514';
            ctx.fill();
            ctx.beginPath();
            ctx.arc(x, y, 9, 0, Math.PI * 2);
            ctx.fillStyle = act > 0 ? `rgba(162, 89, 255, ${act})` : `rgba(255, 0, 127, ${Math.abs(act)})`;
            ctx.fill();
            ctx.strokeStyle = 'rgba(162, 89, 255, 0.5)';
            ctx.lineWidth = 1.5;
            ctx.stroke();
        };

        for (let j = 0; j < level.inputs.length; j++) drawNode(getX(j, level.inputs.length), yBottom, level.inputs[j]);
        if(i === network.levels.length - 1) {
            for (let k = 0; k < level.outputs.length; k++) drawNode(getX(k, level.outputs.length), yTop, level.outputs[k]);
        }
    }
}

// Menggambar Grafik
function drawGraph(ctx, history) {
    if(!ctx) return;
    let width = ctx.canvas.width;
    let height = ctx.canvas.height;
    if(width === 0 || height === 0) return;
    
    ctx.clearRect(0, 0, width, height);

    if (history.length === 0) return;

    let maxFit = Math.max(...history.map(h => h.max), 10);
    let padding = 40;

    let getX = (gen) => lerp(padding, width - padding, (gen - 1) / Math.max(1, history.length - 1));
    let getY = (fit) => lerp(height - padding, padding, fit / maxFit);

    ctx.strokeStyle = 'rgba(162, 89, 255, 0.15)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(padding, padding);
    ctx.lineTo(padding, height - padding);
    ctx.lineTo(width - padding, height - padding);
    ctx.stroke();

    ctx.strokeStyle = '#a259ff';
    ctx.lineWidth = 3;
    ctx.lineJoin = 'round';
    ctx.beginPath();
    for (let h of history) ctx.lineTo(getX(h.gen), getY(h.max));
    ctx.stroke();

    ctx.strokeStyle = '#ff007f';
    ctx.lineWidth = 3;
    ctx.lineJoin = 'round';
    ctx.beginPath();
    for (let h of history) ctx.lineTo(getX(h.gen), getY(h.avg));
    ctx.stroke();
    
    ctx.fillStyle = '#a259ff';
    ctx.font = 'bold 12px Space Grotesk';
    ctx.fillText('MAX', width - padding - 25, getY(history[history.length-1].max) - 10);
    ctx.fillStyle = '#ff007f';
    ctx.fillText('AVG', width - padding - 25, getY(history[history.length-1].avg) + 20);
}

function updateHUD(aliveCount) {
    document.getElementById('hud-time').innerText = `${frames}/${maxFrames}`;
    document.getElementById('hud-pop').innerText = `${aliveCount}`;
    document.getElementById('hud-gen').innerText = generation;
    document.getElementById('hud-success').innerText = successCount;
    document.getElementById('hud-max-fit').innerText = currentMaxFit.toFixed(0);
    document.getElementById('hud-alltime-fit').innerText = allTimeMaxFit.toFixed(0);
}

// Loop Utama Animasi
function animate() {
    if (isTargetMoving) {
        let cycle = Date.now() / 1000;
        target.y = (simCanvas.height / 2) + Math.sin(cycle) * (simCanvas.height * 0.35);
    }

    for (let i = 0; i < simSpeed; i++) {
        let allDead = true;
        for (let drone of drones) {
            if (drone.alive) {
                drone.update(walls, target);
                allDead = false;
            }
        }
        
        for(let j = particles.length - 1; j >= 0; j--) {
            particles[j].update();
            if(particles[j].life <= 0) particles.splice(j, 1);
        }

        frames++;
        if (allDead || frames >= maxFrames) {
            for (let drone of drones) {
                if(drone.alive) {
                    drone.alive = false;
                    drone.calculateFitness(target, initialDist);
                }
            }
            savedDrones = [...drones];
            nextGeneration();
            break;
        }
    }

    let ctx = simCanvas.getContext('2d');
    ctx.clearRect(0, 0, simCanvas.width, simCanvas.height);

    // Render rintangan
    ctx.strokeStyle = '#ff007f';
    ctx.lineWidth = 4;
    ctx.shadowBlur = 15;
    ctx.shadowColor = '#ff007f';
    ctx.lineCap = 'round';
    for (let i = 4; i < walls.length; i++) { 
        let w = walls[i];
        ctx.beginPath();
        ctx.moveTo(w.A.x, w.A.y);
        ctx.lineTo(w.B.x, w.B.y);
        ctx.stroke();
    }
    ctx.shadowBlur = 0;
    ctx.lineCap = 'butt';

    // Start
    ctx.fillStyle = 'rgba(162, 89, 255, 0.15)';
    ctx.strokeStyle = 'rgba(162, 89, 255, 0.5)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(startX, startY, 25, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Target
    ctx.shadowBlur = 25;
    ctx.shadowColor = '#00f0ff';
    let pulse = Math.sin(Date.now() / 200) * 5;
    ctx.fillStyle = '#00f0ff';
    ctx.beginPath();
    ctx.arc(target.x, target.y, target.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = 'rgba(0, 240, 255, 0.5)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(target.x, target.y, target.radius + pulse + 8, 0, Math.PI * 2);
    ctx.stroke();
    ctx.shadowBlur = 0;

    for(let p of particles) p.draw(ctx);

    let bestDrone = getBestDrone();
    for (let drone of drones) {
        if (drone !== bestDrone && drone.alive) drone.draw(ctx, false);
    }
    
    // Update visualisasi sidebar sesuai tab aktif
    let activeTab = document.querySelector('.tab-btn.active').dataset.tab;

    if (bestDrone && bestDrone.alive) {
        bestDrone.draw(ctx, true);
        if(activeTab === 'brain') drawNetwork(nnCanvas.getContext('2d'), bestDrone.brain);
    } else if (savedDrones.length > 0) {
        let bestSaved = savedDrones.reduce((a, b) => a.fitness > b.fitness ? a : b);
        if(activeTab === 'brain') drawNetwork(nnCanvas.getContext('2d'), bestSaved.brain);
    }

    if(activeTab === 'graph') drawGraph(graphCanvas.getContext('2d'), fitnessHistory);

    let aliveCount = drones.filter(d => d.alive).length;
    updateHUD(aliveCount);

    animationId = requestAnimationFrame(animate);
}
