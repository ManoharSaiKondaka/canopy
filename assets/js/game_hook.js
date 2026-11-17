
export default {
    mounted() {
        this.canvas = this.el.querySelector("canvas");
        this.ctx = this.canvas.getContext("2d");

        const CEILING_HEIGHT = 10;
        const SHOOTER_WIDTH = 40;
        const SHOOTER_HEIGHT = 40;
        const SHOOTER_MARGIN_BOTTOM = 4;
        const LASER_SPEED = 15;
        const TARGET_COUNT = 20;

        this.gameActive = false;
        this.animationId = null;

        this.playerX = 50;
        this.lasers = [];
        this.currentColor = "#ff0055";
        this.colors = ["#ff0055", "#00e5ff", "#00ff66"];
        this.targets = [];
        this.shotsUntilColorChange = 0;

        this.resize = () => {
            const rect = this.el.getBoundingClientRect();
            this.canvas.width = rect.width;
            this.canvas.height = rect.height;

            this.targetWidth = this.canvas.width / TARGET_COUNT;

            if (this.targets.length === 0) {
                for (let i = 0; i < TARGET_COUNT; i++) {
                    this.targets.push({
                        x: i * this.targetWidth,
                        color: this.colors[Math.floor(Math.random() * 3)],
                        health: 3
                    });
                }
            }
        };

        setTimeout(this.resize, 50);
        window.addEventListener("resize", this.resize);

        this.handleEvent("game_started", () => {
            this.gameActive = true;
            this.lasers = [];
            this.shotsUntilColorChange = Math.floor(Math.random() * 3) + 1;

            if (!this.animationId) {
                this.draw();
            }
        });

        this.handleEvent("game_over", () => {
            this.gameActive = false;
            this.lasers = [];
        });

        window.addEventListener("mousemove", (e) => {
            if (!this.gameActive) return;

            const rect = this.canvas.getBoundingClientRect();
            const xPercent = ((e.clientX - rect.left) / rect.width) * 100;

            this.playerX = Math.max(2, Math.min(98, xPercent));
        });

        window.addEventListener("mousedown", (e) => {
            if (!this.gameActive) return;
            if (e.target.closest("header")) return;

            this.lasers.push({
                x: (this.playerX / 100) * this.canvas.width,
                y: this.canvas.height - SHOOTER_HEIGHT - SHOOTER_MARGIN_BOTTOM - 10,
                color: this.currentColor
            });

            this.shotsUntilColorChange--;

            if (this.shotsUntilColorChange <= 0) {
                const availableColors = this.colors.filter(
                    color => color !== this.currentColor
                );

                this.currentColor =
                    availableColors[
                    Math.floor(Math.random() * availableColors.length)
                    ];

                this.shotsUntilColorChange =
                    Math.floor(Math.random() * 3) + 1;
            }
        });

        this.draw = () => {
            this.animationId = null;

            this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

            // TARGETS
            this.ctx.shadowBlur = 0;

            this.targets.forEach((t) => {
                this.ctx.fillStyle = t.color;
                this.ctx.globalAlpha = 0.5 + (t.health / 3) * 0.5;

                this.ctx.fillRect(t.x, 0, this.targetWidth, CEILING_HEIGHT);

                this.ctx.fillStyle = "black";
                this.ctx.font = "bold 12px Arial";
                this.ctx.textAlign = "center";

                this.ctx.fillText(
                    t.health,
                    t.x + this.targetWidth / 2,
                    CEILING_HEIGHT / 2 + 4
                );

                this.ctx.globalAlpha = 1;
            });

            // LASERS: Only move while playing
            if (this.gameActive) {
                this.lasers = this.lasers.filter(l => {
                    l.y -= LASER_SPEED;

                    if (l.y < CEILING_HEIGHT) {
                        const hitIndex = Math.floor(l.x / this.targetWidth);
                        const target = this.targets[hitIndex];

                        if (target) {
                            const success = target.color === l.color;

                            this.pushEvent("hit_target", {
                                success: String(success),
                                color:
                                    l.color === "#ff0055" ? "red" :
                                        l.color === "#00e5ff" ? "blue" : "green"
                            });

                            if (success) {
                                target.health--;

                                if (target.health <= 0) {
                                    target.health = 3;
                                    target.color =
                                        this.colors[
                                        Math.floor(Math.random() * 3)
                                        ];
                                }
                            }
                        }

                        return false;
                    }

                    return true;
                });
            }

            // DRAW LASERS (also visible while paused)
            this.lasers.forEach(l => {
                this.ctx.fillStyle = l.color;
                this.ctx.shadowColor = l.color;
                this.ctx.shadowBlur = 15;

                this.ctx.beginPath();
                this.ctx.roundRect(l.x - 3, l.y - 30, 6, 40, 3);
                this.ctx.fill();
            });

            // SHOOTER: Always visible
            const px = (this.playerX / 100) * this.canvas.width;
            const shooterY =
                this.canvas.height - SHOOTER_HEIGHT - SHOOTER_MARGIN_BOTTOM;

            this.ctx.shadowColor = this.currentColor;
            this.ctx.shadowBlur = this.gameActive ? 15 : 3;

            this.ctx.fillStyle = "#222";
            this.ctx.beginPath();

            this.ctx.roundRect(
                px - SHOOTER_WIDTH / 2,
                shooterY,
                SHOOTER_WIDTH,
                SHOOTER_HEIGHT,
                6
            );

            this.ctx.fill();

            this.ctx.fillStyle = this.gameActive ? this.currentColor : "#555";
            this.ctx.fillRect(px - 5, shooterY - 15, 10, 15);

            // Continue animation only while playing
            if (this.gameActive) {
                this.animationId = requestAnimationFrame(this.draw);
            }
        };

        // Initial static render: shooter and targets visible, disabled
        this.draw();
    },

    destroyed() {
        this.gameActive = false;
        cancelAnimationFrame(this.animationId);
        window.removeEventListener("resize", this.resize);
    }
};
