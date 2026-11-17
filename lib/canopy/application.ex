defmodule Canopy.Application do
  use Application

  @impl true
  def start(_type, _args) do
    children = [
      CanopyWeb.Telemetry,
      {DNSCluster, query: Application.get_env(:canopy, :dns_cluster_query) || :ignore},
      {Phoenix.PubSub, name: Canopy.PubSub},
      Canopy.Repo,
      Canopy.BallManager,
      CanopyWeb.Endpoint
    ]

    opts = [strategy: :one_for_one, name: Canopy.Supervisor]
    Supervisor.start_link(children, opts)
  end

  @impl true
  def config_change(changed, _new, removed) do
    CanopyWeb.Endpoint.config_change(changed, removed)
    :ok
  end
end
