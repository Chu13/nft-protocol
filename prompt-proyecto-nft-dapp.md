# Nuevo proyecto — NFT Minting DApp + Marketplace (Level 03)

## Contexto

Este proyecto es el tercero de tres que forman un mini ecosistema DeFi en el portfolio. Depende del Level 02 (ERC-20 Staking Protocol): el token ERC-20 desplegado en ese proyecto es la moneda de pago tanto para mintear como para comprar y vender NFTs en el marketplace.

Antes de arrancar, obtener del repo del Level 02:
- Dirección del contrato del token ERC-20 en Ethereum
- Dirección del contrato del token ERC-20 en BNB Chain
- ABI del token ERC-20

---

## Qué es

Un ecosistema NFT completo en tres partes: un contrato de colección, un marketplace de compraventa entre usuarios, y una interfaz que incluye mint page, marketplace público y perfil de coleccionista. El pago en todas las transacciones (mint y compraventa) se hace en el token ERC-20 del Level 02.

---

## Redes soportadas

- **Ethereum** (misma red que el Level 02 — testnet Sepolia o mainnet)
- **BNB Chain** (misma red que el Level 02 — testnet o mainnet)

Ambos contratos (NFT + Marketplace) se despliegan en las dos redes.

---

## Componente 1 — Contratos

### Contrato NFT (ERC-721)

- Supply limitado configurable
- Precio de mint denominado en el token ERC-20 del Level 02
- El contrato recibe la dirección del token ERC-20 en el constructor
- Flujo de mint: approve ERC-20 → mint
- Límite de mints por wallet configurable
- Dos fases: allowlist con Merkle proof → fase pública
- Soporte ERC-2981 (royalties): el creador recibe un porcentaje configurable de cada venta secundaria en el marketplace
- Owner puede cambiar de fase, pausar el mint, y hacer withdraw de los tokens acumulados

### Contrato Marketplace

- Permite a los holders listar sus NFTs a la venta a precio fijo, denominado en el token ERC-20
- Flujo de listado: el seller aprueba al marketplace para transferir su NFT → crea el listing
- Flujo de compra: el buyer aprueba el token ERC-20 → marketplace transfiere el NFT al buyer y los tokens al seller, descontando royalties al creador
- Cancelar listing: el seller puede retirar su NFT del marketplace en cualquier momento
- El marketplace cobra una fee configurable por transacción (opcional, para demostrar el patrón)
- Funciones principales: list(tokenId, price), buy(tokenId), cancelListing(tokenId), getListings(), getListing(tokenId)

### Tests

**NFT:**
- Mint en allowlist con Merkle proof válido e inválido
- Mint en fase pública
- Flujo completo approve ERC-20 → mint → verificar balance
- Límite por wallet y supply máximo
- Verificar pago de royalties (ERC-2981)

**Marketplace:**
- Listado, compra y cancelación de NFT
- Flujo completo: list → buyer aprueba ERC-20 → buy → verificar transferencia de NFT y tokens
- Verificar que los royalties se descuentan y transfieren al creador
- Verificar que solo el owner del NFT puede listar
- Verificar que un listing cancelado no puede comprarse

### Deploy

- Scripts de deploy en orden: token ERC-20 (del L02, ya existe) → NFT → Marketplace (con dirección del NFT y del token)
- Contratos verificados en Etherscan y BscScan

---

## Componente 2 — Frontend

### Mint page

- Selector de red: Ethereum o BNB Chain
- Conectar wallet vía EIP-1193
- Supply restante, precio en el token ERC-20, fase actual
- Si la wallet está en allowlist durante esa fase
- Flujo de dos pasos claramente comunicado: approve → mint
- Feedback visual en cada paso (pending / confirmed / error)
- Preview de 4 a 9 NFTs de la colección
- Link al staking del Level 02 para que el usuario pueda conseguir el token si no tiene

### Marketplace

Página pública con todos los NFTs actualmente listados a la venta:

- Grid de NFTs listados con imagen, nombre, precio en el token ERC-20 y seller
- Filtros básicos: precio ascendente/descendente
- Al hacer click en un NFT: detalle con imagen grande, atributos, historial de precio si está disponible, y botón de compra
- Flujo de compra: approve ERC-20 → buy, con feedback de dos pasos
- Si la wallet conectada es el seller del NFT, mostrar opción de cancelar listing en lugar del botón de compra

### Perfil de coleccionista

Página accesible en /profile/[address]:

- Funciona en modo read-only para cualquier dirección pública
- Si la wallet conectada coincide con la dirección, mostrar opciones de acción
- Contenido:
  - Dirección del perfil (abreviada) y botón de copiar
  - Grid de todos los NFTs de la colección que posee esa wallet
  - Para cada NFT: imagen, nombre, atributos y estado (listado a la venta o no)
  - Si el NFT está listado: mostrar precio y opción de cancelar listing (solo si es el owner conectado)
  - Si el NFT no está listado: opción de listar a la venta (solo si es el owner conectado)
- Stats del perfil: total de NFTs en posesión, total gastado en mints (si es calculable), valor total de NFTs listados

### Navegación entre secciones

Las tres secciones (mint, marketplace, perfil) están conectadas entre sí:
- Desde la mint page: link al marketplace para ver la colección en circulación
- Desde el marketplace: click en el seller de un NFT lleva al perfil de ese seller
- Desde el perfil: link directo para ir a mintear si el usuario no tiene NFTs todavía
- Link al Level 02 visible en mint page y perfil: "Get [TOKEN] by staking → Level 02"

---

## Requisitos de calidad

### Visual

- Diseño terminado con identidad visual propia para la colección
- Paleta oscura, consistente con el contexto Web3 y con el portfolio
- Los flujos de dos pasos (approve + mint, approve + buy) claramente comunicados en cada caso
- Identificador visual de la red activa en todo momento
- Responsive: mobile y desktop

### Técnico

- Sin backend — los contratos son la fuente de verdad
- Configuración de redes, contratos NFT, Marketplace y token ERC-20 en un archivo centralizado
- Código del contrato y del frontend en el mismo repo en carpetas separadas (/contracts y /app)

---

## Repo y documentación

### README (requerido)

- Qué es el proyecto y sus tres secciones (una línea cada una)
- Screenshot o GIF de cada sección: mint page, marketplace, perfil
- Contexto del ecosistema: este proyecto usa el token del Level 02
- Redes soportadas y direcciones de todos los contratos desplegados
- Stack utilizado
- Cómo correr los tests
- Cómo correr el frontend localmente
- Variables de entorno necesarias

### Estructura del repo

/contracts    — NFT, Marketplace, scripts de deploy, tests
/app          — mint page, marketplace, perfil de coleccionista
README.md

---

## Outputs que necesita el portfolio

- demoUrl: URL pública del frontend en producción
- githubUrl: URL del repo público en GitHub

---

## Lo que NO entra en scope

- Subastas o listings con precio variable en el tiempo
- Ofertas (offers) de compradores a holders que no listaron
- Soporte para otras redes además de Ethereum y BNB Chain
- Reveal mechanic post-mint
- Panel de admin en la UI
