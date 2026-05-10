# Open Questions

1. Should notebook-skill manifests be embedded in `.src.md`, stored as sidecar `skill.yaml`, or both?
2. What is the minimum validator immutability guarantee: Git review, content hash, signature, or registry approval?
3. How much stdout/stderr/model output should traces retain by default?
4. Should model-call cells be replayed, cached, or always treated as recorded non-deterministic events?
5. Can the current SQLite config/secrets store satisfy MVP privacy expectations, or should skill secrets use a separate provider abstraction immediately?
6. Should the first runner be CLI-only, API-only, or both?
7. Which existing app-builder diff UI can be reused without reintroducing app-builder product scope?
8. What is the canonical schema source: Zod, JSON Schema, or generated dual format?
