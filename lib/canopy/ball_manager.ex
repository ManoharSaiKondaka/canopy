defmodule Canopy.BallManager do
  use GenServer

  def start_link(_) do
    GenServer.start_link(__MODULE__, %{red: 0, blue: 0, green: 0}, name: __MODULE__)
  end

  def get_counts, do: GenServer.call(__MODULE__, :get_counts)

  def add_balls(color, amount),
    do: GenServer.call(__MODULE__, {:add, color, amount})

  def remove_balls(color, amount),
    do: GenServer.call(__MODULE__, {:remove, color, amount})

  def reset_random_balls(total \\ 100) do
    GenServer.call(__MODULE__, {:reset_random, total})
  end

  @impl true
  def init(state), do: {:ok, state}

  @impl true
  def handle_call({:reset_random, total}, _from, _state) do
    counts =
      Enum.reduce(1..total, %{red: 0, blue: 0, green: 0}, fn _, acc ->
        color = Enum.random([:red, :blue, :green])
        Map.update!(acc, color, &(&1 + 1))
      end)

    {:reply, counts, counts}
  end

  @impl true
  def handle_call(:get_counts, _from, state), do: {:reply, state, state}

  @impl true
  def handle_call({:add, color, amount}, _from, state) do
    updated = Map.update!(state, color, &(&1 + amount))
    {:reply, updated, updated}
  end

  @impl true
  def handle_call({:remove, color, amount}, _from, state) do
    updated = Map.update!(state, color, &max(0, &1 - amount))
    {:reply, updated, updated}
  end
end
