import * as signalR from "@microsoft/signalr";
import { getToken } from "./auth";

const HUB_URL = process.env.NEXT_PUBLIC_API_BASE_URL 
  ? process.env.NEXT_PUBLIC_API_BASE_URL.replace("/api", "/hubs/booking")
  : "http://localhost:5000/hubs/booking";

let connection: signalR.HubConnection | null = null;

export function getSignalRConnection(): signalR.HubConnection {
  if (!connection) {
    connection = new signalR.HubConnectionBuilder()
      .withUrl(HUB_URL, {
        accessTokenFactory: () => getToken() || "",
        skipNegotiation: false,
        transport: signalR.HttpTransportType.WebSockets | signalR.HttpTransportType.LongPolling,
      })
      .withAutomaticReconnect([0, 2000, 5000, 10000])
      .configureLogging(signalR.LogLevel.Warning)
      .build();
  }

  return connection;
}

export async function startSignalR(): Promise<signalR.HubConnection | null> {
  const hub = getSignalRConnection();

  if (hub.state === signalR.HubConnectionState.Disconnected) {
    try {
      await hub.start();
    } catch {
      // Backend may be offline during static build or offline testing
      return null;
    }
  }

  return hub;
}
