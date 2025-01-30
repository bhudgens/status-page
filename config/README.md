# Status Page Configuration

This directory contains the configuration files for the status page.

## Files

### `systems.json`

Defines the systems that are being monitored. Each system must have:
- `id`: Unique identifier (lowercase alphanumeric with hyphens)
- `name`: Display name
- `description`: Brief description of the system
- `category`: One of: core, frontend, backend, infrastructure, third-party
- `labels`: Optional array of tags

Example:
```json
{
  "systems": [
    {
      "id": "api",
      "name": "API Service",
      "description": "Main API endpoints and services",
      "category": "core",
      "labels": ["api", "core"]
    }
  ]
}
```

### `schema.json`

JSON Schema file that defines the structure and validation rules for both:
- System definitions
- Incident records

The schema enforces:
- Required fields
- Data types
- Format constraints
- Enumerated values
- String lengths/patterns

## Validation

Configuration files are automatically validated against `schema.json` during build time. This ensures:
1. All required fields are present
2. Values match expected formats
3. References between systems and incidents are valid
4. Data integrity is maintained

## Adding New Systems

1. Edit `systems.json`
2. Add a new system object to the `systems` array
3. Ensure it follows the schema requirements
4. Commit changes
5. The status page will automatically update
