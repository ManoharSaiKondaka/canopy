defmodule CanopyWeb.CanopyLive do
  use CanopyWeb, :live_view
  alias Canopy.BallManager

  # ==========================================
  # GAME CONFIGURATION
  # ==========================================

  @colors [:red, :blue, :green]
  @color_hexes %{red: "#ff0055", blue: "#00e5ff", green: "#00ff66"}

  @game_duration 30
  @initial_balls 10

  @balls_per_success 50
  @wrong_hit_penalty_percent 10

  @score_per_success 50
  @score_per_failure 10

  # ==========================================
  # MOUNT
  # ==========================================

  @impl true
  def mount(_params, _session, socket) do
    {:ok,
     assign(socket,
       state: :instructions,
       score: 0,
       time_left: @game_duration,
       timer_ref: nil,
       current_color: :red,
       color_hexes: @color_hexes
     )}
  end

  # ==========================================
  # START / RESTART GAME
  # ==========================================

  @impl true
  def handle_event("start", _params, socket) do
    counts = BallManager.reset_random_balls(@initial_balls)

    if socket.assigns.timer_ref do
      Process.cancel_timer(socket.assigns.timer_ref)
    end

    socket =
      socket
      |> assign(
        state: :live,
        score: @initial_balls,
        time_left: @game_duration
      )
      |> push_event("update_processes", counts)
      |> push_event("game_started", %{})
      |> push_event("game_timer", %{time: @game_duration})

    timer_ref = Process.send_after(self(), :tick, 1000)

    {:noreply, assign(socket, timer_ref: timer_ref)}
  end

  # ==========================================
  # HIT TARGET
  # ==========================================

  def handle_event("hit_target", %{"success" => success, "color" => color_str}, socket) do
    if socket.assigns.state == :live do
      color = Enum.find(@colors, &(to_string(&1) == color_str)) || :red

      new_score =
        if success == "true" do
          BallManager.add_balls(color, @balls_per_success)
          socket.assigns.score + @score_per_success
        else
          current_count = BallManager.get_counts()[color]

          penalty =
            trunc(current_count * @wrong_hit_penalty_percent / 100)

          BallManager.remove_balls(color, penalty)

          max(0, socket.assigns.score - @score_per_failure)
        end

      socket =
        socket
        |> assign(score: new_score)
        |> push_process_update()

      {:noreply, socket}
    else
      {:noreply, socket}
    end
  end

  # ==========================================
  # COLOR CHANGE
  # ==========================================

  def handle_event("color_changed", %{"color" => color_str}, socket) do
    color = Enum.find(@colors, fn c -> to_string(c) == color_str end) || :red
    {:noreply, assign(socket, current_color: color)}
  end

  # ==========================================
  # GAME TIMER
  # ==========================================

  @impl true
  def handle_info(:tick, socket) do
    time_left = socket.assigns.time_left - 1

    if time_left <= 0 do
      socket =
        socket
        |> assign(
          state: :finished,
          time_left: 0,
          timer_ref: nil
        )
        |> push_event("game_over", %{})

      {:noreply, socket}
    else
      timer_ref = Process.send_after(self(), :tick, 1000)

      {:noreply,
       assign(socket,
         time_left: time_left,
         timer_ref: timer_ref
       )}
    end
  end

  # ==========================================
  # PROCESS UPDATES
  # ==========================================

  defp push_process_update(socket) do
    counts = BallManager.get_counts()
    push_event(socket, "update_processes", counts)
  end

  # ==========================================
  # RENDER
  # ==========================================

  @impl true
  def render(assigns) do
    ~H"""
    <div class="min-h-screen w-full flex flex-col bg-black overflow-hidden font-sans">
      <header class="min-h-[60px] flex flex-wrap items-center justify-between gap-3 px-3 sm:px-6 py-3 border-b border-white/10 bg-[#050505] z-50">
        <div class="flex items-center gap-2 sm:gap-3">
          <span class="text-xl text-cyan-400">⚡</span>
          <span class="font-black text-sm tracking-wider text-white">CANOPY</span>
        </div>

        <div class="flex items-center gap-3 sm:gap-6">
          <div class="text-xs sm:text-sm font-mono text-white/50">
            TIME: <span class="text-red-400">{@time_left}s</span>
          </div>

          <div class="text-xs sm:text-sm font-mono text-white/50">
            SCORE: <span class="text-cyan-400">{@score}</span>
          </div>

          <button
            phx-click="start"
            class={"px-3 sm:px-6 py-2 text-xs sm:text-sm bg-cyan-500 text-black font-bold rounded hover:bg-cyan-400 transition-colors #{if @state == :live, do: "invisible"}"}
          >
            {if @state == :finished, do: "RESTART ↻", else: "START ▶"}
          </button>
        </div>
      </header>

      <main class="flex-1 relative w-full min-h-0 bg-[#020202] overflow-hidden">
        
    <!-- Background Process Layer -->
        <div
          class="absolute inset-0 z-0"
          phx-hook="BackgroundCanvas"
          id="bg-container"
          phx-update="ignore"
        >
          <canvas
            id="bg-canvas"
            class="absolute inset-0 w-full h-full"
          >
          </canvas>
        </div>
        
    <!-- Game Layer -->
        <div
          class="absolute inset-0 z-10"
          phx-hook="GameCanvas"
          id="game-container"
          data-state={@state}
          phx-update="ignore"
        >
          <canvas
            id="game-canvas"
            class="absolute inset-0 w-full h-full"
          >
          </canvas>
        </div>
      </main>
    </div>
    """
  end
end
