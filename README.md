## Otel basics

This project is a tiny two services that communicate between them async (kafka) as well as some config around observability

## Local cluster system of a choice

- **kind**: `brew install kind` then `kind create cluster --name tiny-distributed-system`

## 1. Build the app image

```sh
docker build -t rolldice-app:local .
```

## 2. Make the image available to the cluster

Only the app image is local; Prometheus and Grafana are pulled from public registries.

`kind load docker-image rolldice-app:local --name tiny-distributed-system`

## 3. Apply

```sh
kubectl apply -k k8s/
kubectl -n tiny-distributed-system get pods -w
```

## 4. Access the services

```sh
kubectl -n tiny-distributed-system port-forward svc/app 3000:3000
kubectl -n tiny-distributed-system port-forward svc/prometheus 9090:9090
kubectl -n tiny-distributed-system port-forward svc/grafana 3001:3000
```

Grafana login: `admin` / `admin`.

## Update the app after a code change

```sh
docker build -t rolldice-app:local .
kind load docker-image rolldice-app:local --name tiny-distributed-system
kubectl -n tiny-distributed-system rollout restart deploy/rolldice-app
```

## Tear down

```sh
kubectl delete -k k8s/
```
