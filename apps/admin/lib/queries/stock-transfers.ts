import { randomUUID } from "node:crypto";

export async function requestSerialTransfer(
  input: any,
  actorId: string,
): Promise<{ id: string; [key: string]: any }> {
  throw new Error("requestSerialTransfer must be implemented as a single API call in Go backend");
}

export async function approveSerialTransfer(
  input: any,
  actorId: string,
): Promise<any> {
  throw new Error("approveSerialTransfer must be implemented as a single API call in Go backend");
}

export async function dispatchSerialTransfer(
  input: any,
  actorId: string,
): Promise<any> {
  throw new Error("dispatchSerialTransfer must be implemented as a single API call in Go backend");
}

export async function receiveSerialTransfer(
  input: any,
  actorId: string,
): Promise<any> {
  throw new Error("receiveSerialTransfer must be implemented as a single API call in Go backend");
}

export async function reportMissingTransferUnits(
  input: any,
  actorId: string,
): Promise<any> {
  throw new Error("reportMissingTransferUnits must be implemented as a single API call in Go backend");
}

export async function closeSerialTransfer(
  input: any,
  actorId: string,
): Promise<any> {
  throw new Error("closeSerialTransfer must be implemented as a single API call in Go backend");
}