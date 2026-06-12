# Anicca

Anicca es una aplicación para publicar proyectos de creadores y recibir contribuciones directas usando Celo y COPm. La persistencia de proyectos y transacciones se maneja con Supabase, y la lógica de reparto de pagos vive en un contrato inteligente.

## Stack

- Next.js 16
- React 19
- Supabase
- Solidity
- ethers
- solc

## Funcionalidades

- Crear proyectos con validaciones de formulario.
- Persistir proyectos en Supabase.
- Listar solo proyectos reales desde la base de datos.
- Conectar wallet desde el frontend.
- Preparar pagos en CELO y COPm.
- Repartir contribuciones desde contrato inteligente:
  - 97% para el creador.
  - 3% para la plataforma.
- Registrar hashes de transacción en Supabase.

## Supabase

Ejecuta el SQL de `supabase/schema.sql` en el SQL editor de Supabase. Esto crea:

- `campaigns`
- `contributions`
- políticas básicas de lectura e inserción para el MVP

## Desarrollo

Instala dependencias:

```bash
npm install
```

Levanta el servidor local:

```bash
npm run dev
```

Abre:

```text
http://localhost:3000
```

## Contrato inteligente

El contrato está en:

```text
contracts/AniccaContributions.sol
```

Compilar:

```bash
npm run contract:compile
```

Desplegar:

```bash
npm run contract:deploy
```

## Validación

Antes de subir cambios:

```bash
npm run lint
npm run build
npm run contract:compile
```
