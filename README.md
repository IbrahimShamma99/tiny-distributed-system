## Otel basics

This is a service that acts into how I want to build things moving forward

## Local cluster system of a choice

- **kind**: `brew install kind` then `kind create cluster --name otel-basics`

## 1. Build the app image

```sh
docker build -t rolldice-app:local .
```

## 2. Make the image available to the cluster

Only the app image is local; Prometheus and Grafana are pulled from public registries.

`kind load docker-image rolldice-app:local --name otel-basics`

## 3. Apply

```sh
kubectl apply -k k8s/
kubectl -n otel-basics get pods -w
```

## 4. Access the services

```sh
kubectl -n otel-basics port-forward svc/app 3000:3000
kubectl -n otel-basics port-forward svc/prometheus 9090:9090
kubectl -n otel-basics port-forward svc/grafana 3001:3000
```

Grafana login: `admin` / `admin`.

## Update the app after a code change

```sh
docker build -t rolldice-app:local .
kind load docker-image rolldice-app:local --name otel-basics
kubectl -n otel-basics rollout restart deploy/rolldice-app
```

## Tear down

```sh
kubectl delete -k k8s/
```
