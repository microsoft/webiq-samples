# Histórico de incidencias de telecomunicaciones 2026 · Logística Meridiana

> **DOCUMENTO SINTÉTICO.** Creado para una demo de Microsoft Foundry IQ y Web IQ. Logística Meridiana es ficticia. Estas incidencias son inventadas y **no describen el servicio real de ningún operador**.

Registro interno de Sistemas (enero-septiembre de 2026), servicio prestado por el operador actual según el contrato ORG-CTR-2023-0412.

## 1. Disponibilidad mensual medida

| Sede | Disponibilidad media | Mes peor |
|---|---|---|
| Oficina central (Coslada) | 99,97 % | Junio: 99,91 % |
| Delegaciones (media de 5) | 99,93 % | Marzo: 99,82 % (Valencia) |
| Almacenes (media de 2) | 99,90 % | Julio: 99,71 % (Getafe) |

## 2. Incidencias relevantes

| Fecha | Sede | Causa | Duración | ¿Dentro del SLA? |
|---|---|---|---|---|
| 11-mar-2026 | Delegación de Valencia | Corte de fibra por obras de terceros | 5 h 40 min | Sí |
| 18-jun-2026 | Oficina central | Fallo del router principal; el respaldo 5G entró en 4 minutos | 2 h 10 min (servicio degradado) | Sí |
| 22-jul-2026 | Almacén de Getafe | Avería en la arqueta de acceso en plena temporada alta | **9 h 15 min** | **No.** Crédito aplicado: 25 % (tope) |
| 3-sep-2026 | Almacén de Alcalá | Corte de suministro eléctrico del polígono | 3 h 05 min | No aplica (causa ajena) |

## 3. Impacto y lecciones

- La incidencia de Getafe del 22 de julio paralizó la preparación de pedidos durante el turno de tarde. Impacto estimado: **unos 160.000 €** frente a un crédito SLA recibido de **16,25 €**. Los créditos SLA no compensan el impacto real en negocio.
- Recomendación de Sistemas: exigir en la nueva contratación un **MTTR de 6 horas o menos 24×7 en almacenes**, respaldo 5G en todas las sedes y créditos con un tope de al menos el 30 %.
- La satisfacción con el gestor de cuenta del operador actual es alta (8/10 en la encuesta interna).
