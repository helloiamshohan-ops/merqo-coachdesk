# Third-party notices

## Current executable development slice

The executable development slice intentionally uses only the Node.js standard library and the built-in `node:sqlite` module. No npm package is currently required or redistributed by this repository.

- **Node.js** — JavaScript runtime. Copyright Node.js contributors. Node.js is distributed under the MIT License and includes components under additional licenses. See the Node.js distribution for its complete license inventory.
- **SQLite** — embedded database engine exposed through Node's `node:sqlite` module. SQLite is public domain; Node's binding remains part of the Node.js distribution.

## Planned production stack

The approved production architecture is .NET LTS, WPF, ASP.NET Core, Entity Framework Core, PostgreSQL, xUnit, Open XML SDK, a Bengali-validated PDF library, and a Windows installer. These dependencies have not yet been added to the executable slice. Before adding them, record exact versions, licenses, transitive dependencies, and redistribution obligations here.

This file is not a claim that the planned stack has been reviewed or shipped.
