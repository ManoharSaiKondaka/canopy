
export default {
    mounted() {
        this.canvas = this.el.querySelector("canvas");
        this.ctx = this.canvas.getContext("2d");

        this.running = false;
        this.animationId = null;
        this.dots = [];

        this.resize = () => {
            const rect = this.el.getBoundingClientRect();
            this.canvas.width = rect.width;
            this.canvas.height = rect.height;
        };

        setTimeout(this.resize, 50);
        window.addEventListener("resize", this.resize);

        const colorMap = {
            red: "#ff0055",
            blue: "#00e5ff",
            green: "#00ff66"
        };

        this.addDots = (color, amount) => {
            for (let i = 0; i < amount; i++) {
                this.dots.push({
                    x: Math.random() * this.canvas.width,
                    y: Math.random() * this.canvas.height,
                    vx: (Math.random() - 0.5) * 5,
                    vy: (Math.random() - 0.5) * 5,
                    size: Math.random() * 3 + 2,
                    color
                });
            }
        };

        this.handleEvent("update_processes", (counts) => {
            Object.entries(colorMap).forEach(([color, hex]) => {
                const targetCount = counts[color] || 0;

                const existing = this.dots.filter(
                    dot => dot.color === hex
                );

                const difference = targetCount - existing.length;

                if (difference > 0) {
                    this.addDots(hex, difference);
                } else if (difference < 0) {
                    let toRemove = -difference;

                    this.dots = this.dots.filter(dot => {
                        if (dot.color === hex && toRemove > 0) {
                            toRemove--;
                            return false;
                        }

                        return true;
                    });
                }
            });
        });

        this.draw = () => {
            this.animationId = null;

            this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
            this.ctx.shadowBlur = 10;

            this.dots.forEach(dot => {
                if (this.running) {
                    dot.x += dot.vx;
                    dot.y += dot.vy;

                    if (dot.x < 0 || dot.x > this.canvas.width) dot.vx *= -1;
                    if (dot.y < 0 || dot.y > this.canvas.height) dot.vy *= -1;
                }

                this.ctx.fillStyle = dot.color;
                this.ctx.shadowColor = dot.color;

                this.ctx.beginPath();
                this.ctx.arc(dot.x, dot.y, dot.size, 0, Math.PI * 2);
                this.ctx.fill();
            });

            if (this.running) {
                this.animationId = requestAnimationFrame(this.draw);
            }
        };

        this.handleEvent("game_started", () => {
            this.running = true;

            if (!this.animationId) {
                this.draw();
            }
        });

        this.handleEvent("game_over", () => {
            this.running = false;
            cancelAnimationFrame(this.animationId);
            this.draw(); // Render one final static frame
        });

        // Initial static background
        this.draw();
    },

    destroyed() {
        this.running = false;
        cancelAnimationFrame(this.animationId);
        window.removeEventListener("resize", this.resize);
    }
};
