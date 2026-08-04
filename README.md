# Project Karna

> An AI-powered distributed file storage and knowledge system.

Project Karna is a long-term systems engineering project exploring how reliable
file storage can evolve from a single-node backend into a distributed,
fault-aware storage system with semantic retrieval and AI-assisted knowledge
access.

The project is being developed incrementally, with an emphasis on understanding
the engineering problems behind each architectural decision rather than
recreating production systems such as Amazon S3, Google Drive, or Dropbox.

## Why Karna?

Karna is the project's codename, inspired by the character from the Mahabharata.

The name is not intended as a technical acronym. It was chosen as a short,
memorable Indian-origin codename for a long-term engineering project.

## Goals

Karna is primarily a learning project focused on:

- Large-file streaming and I/O
- Chunked and resumable uploads
- Content integrity and hashing
- Metadata and object-storage separation
- Asynchronous background processing
- Idempotency and retry safety
- Distributed storage
- Replication and failure recovery
- Concurrency and consistency
- Observability
- Semantic search
- Retrieval-Augmented Generation (RAG)
- AI infrastructure fundamentals

## Architecture

Karna will evolve incrementally.

### Initial Architecture

Client
  |
  v
API
  |
  +---- PostgreSQL (metadata)
  |
  +---- Local Storage (file content)

### Target Architecture

                         Client
                            |
                            v
                         API
                            |
               +------------+-------------+
               |                          |
               v                          v
          PostgreSQL                 Coordinator
          (Metadata)                      |
                               +----------+----------+
                               |          |          |
                               v          v          v
                           Storage A  Storage B  Storage C
                               |
                               v
                         Background Queue
                               |
                               v
                            Workers
                               |
                   +-----------+-----------+
                   |                       |
                   v                       v
             File Processing         AI Processing
                                           |
                                    Semantic Retrieval
                                           |
                                          RAG

The target architecture represents the direction of the project, not its
current implementation.

## Roadmap

### Phase 0 — Architecture & Fundamentals
- Requirements
- File upload internals
- Initial architecture
- Data model
- Storage boundaries

### Phase 1 — Single-Node Storage
- Authentication
- File upload/download
- Metadata management
- Ownership
- Streaming
- Local storage

### Phase 2 — Upload Engineering
- Chunked uploads
- Upload sessions
- Checksums
- Resumable uploads
- Idempotency

### Phase 3 — Storage Abstraction
- Separate metadata from physical storage
- Storage provider interface
- Replaceable storage implementations

### Phase 4 — Background Processing
- Redis
- Job queues
- Workers
- Retry policies
- Idempotent processing

### Phase 5 — Distributed Storage
- Storage nodes
- Node registration
- Chunk placement
- Heartbeats
- Replication
- Failure detection

### Phase 6 — Reliability
- Replica recovery
- Concurrency handling
- Caching where justified
- Rate limiting
- Structured logging
- Metrics

### Phase 7 — Document Intelligence
- Text extraction
- Document chunking
- Embeddings
- Vector search
- Semantic retrieval

### Phase 8 — RAG
- Context retrieval
- Prompt construction
- LLM integration
- Grounded answers
- Source references

### Phase 9 — AI Infrastructure
- Local embedding models
- Local LLM experimentation
- Model serving
- Inference latency
- Caching and batching concepts

### Phase 10+ — Testing, Deployment & Engineering Analysis
- Integration tests
- Failure experiments
- Benchmarks
- Deployment
- Architecture documentation
- Engineering write-ups

## Current Status

🚧 Phase 0 — Architecture & Fundamentals

Karna is currently under active development.

Features listed in the roadmap represent planned work and should not be
interpreted as already implemented.

## Engineering Principles

- Understand the problem before introducing infrastructure.
- Prefer measurable evidence over scalability claims.
- Introduce technologies only when they solve a concrete problem.
- Design important operations around failure, retries, and concurrency.
- Keep architecture understandable before making it distributed.
- Treat AI as part of the system rather than a wrapper around an LLM API.

## Tech Stack

Current:

- TypeScript
- Node.js
- PostgreSQL

Technologies such as Redis, distributed storage nodes, vector search, and LLM
infrastructure will be introduced as the corresponding engineering problems
are reached.

## Disclaimer

Project Karna is an educational systems-engineering project.

It does not attempt to reproduce the scale, guarantees, or infrastructure of
production systems such as Amazon S3, Google Drive, or Dropbox.
