FROM rust:1.92-slim as builder

WORKDIR /app
# install build dependencies (pkg-config and ssl are often needed for lapin)
RUN apt-get update && apt-get install -y pkg-config libssl-dev && rm -rf /var/lib/apt/lists/*

COPY ./Cargo.toml ./Cargo.toml
COPY ./Cargo.lock ./Cargo.lock

# create a dummy main.rs to cache dependencies
RUN mkdir src && echo "fn main() {}" > src/main.rs
RUN cargo build --release
RUN rm -f target/release/deps/worker*

COPY ./src ./src

RUN cargo build --release

FROM debian:bookworm-slim

WORKDIR /app
# install runtime dependencies
RUN apt-get update && apt-get install -y libssl3 ca-certificates && rm -rf /var/lib/apt/lists/*


# copy the binary from the builder
COPY --from=builder /app/target/release/worker .

# create a folder for the audio files (shared volume)
RUN mkdir -p /app/data

CMD ["./worker"]