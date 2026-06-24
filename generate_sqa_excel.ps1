$outPath = 'c:\Users\USER\Desktop\guardian_gastos_proyecto\Casos_Prueba_SQA_Otro_Grupo.xlsx'

$excel = New-Object -ComObject Excel.Application
$excel.Visible = $false
$excel.DisplayAlerts = $false

$wb = $excel.Workbooks.Add()

function Ensure-Sheet($wb, $name, $index) {
  $ws = $null
  try { $ws = $wb.Worksheets.Item($name) } catch { }
  if (-not $ws) { $ws = $wb.Worksheets.Add() }
  $ws.Name = $name
  $ws.Move($wb.Worksheets.Item($index))
  $ws
}

function Write-Title($ws, [int]$row, [string]$title) {
  $ws.Cells.Item($row, 1).Value2 = $title
  $ws.Cells.Item($row, 1).Font.Bold = $true
  $ws.Cells.Item($row, 1).Font.Size = 14
  $row + 2
}

function Write-Table($ws, [int]$row, $headers, $rows) {
  $colCount = $headers.Count
  for ($c = 0; $c -lt $colCount; $c++) {
    $cell = $ws.Cells.Item($row, $c + 1)
    $cell.Value2 = $headers[$c]
    $cell.Font.Bold = $true
    $cell.Interior.ColorIndex = 15
    $cell.WrapText = $true
  }

  $r = $row + 1
  foreach ($dataRow in $rows) {
    for ($c = 0; $c -lt $colCount; $c++) {
      $cell = $ws.Cells.Item($r, $c + 1)
      $cell.Value2 = $dataRow[$c]
      $cell.WrapText = $true
      $cell.VerticalAlignment = -4160
    }
    $r++
  }

  $endRow = $r - 1
  $range = $ws.Range($ws.Cells.Item($row, 1), $ws.Cells.Item($endRow, $colCount))
  $range.Borders.LineStyle = 1
  $range.Columns.AutoFit() | Out-Null

  $endRow + 3
}

# --- Hoja Portada ---
$wsPort = Ensure-Sheet $wb 'Portada' 1
$portada = @(
  @('Proyecto evaluado', 'Aplicacion de gestion de gastos familiar (Otro Grupo)'),
  @('Equipo SQA', 'Grupo 4 - Guardian de Gastos'),
  @('Fecha', '2026-06-15'),
  @('Alcance inicial', 'Autenticacion, Gestion de Gastos, Dinamica Familiar'),
  @('RF cubiertos', 'RF-01, RF-02, RF-04 al RF-08, RF-07'),
  @('RNF cubiertos', 'RNF-01, RNF-02, RNF-05, RNF-06'),
  @('Convencion IDs', 'MOD-SC-## = Escenario | MOD-DS-## = Set de datos | MOD-CP-### = Caso de prueba'),
  @('Correos de prueba', 'Dominio: @testmail.com (usuarios ficticios para entorno de prueba)')
)
$row = 1
$row = Write-Title $wsPort $row 'Plan de Casos de Prueba - SQA Grupo 4'
$row = Write-Table $wsPort $row @('Campo', 'Valor') $portada

# --- Hoja Autenticacion ---
$wsAut = Ensure-Sheet $wb 'Autenticacion' 2

$scenariosAut = @(
  @('AUT-SC-01', 'Registro individual exitoso con correo y contrasena validos', 'RF-01', 'Positivo'),
  @('AUT-SC-02', 'Registro con correo ya existente en el sistema', 'RF-01', 'Negativo'),
  @('AUT-SC-03', 'Registro con formato de correo invalido', 'RF-01', 'Negativo'),
  @('AUT-SC-04', 'Registro con contrasena debil o vacia', 'RF-01', 'Negativo'),
  @('AUT-SC-05', 'Inicio de sesion exitoso y obtencion de JWT (Supabase Auth)', 'RNF-02', 'Positivo'),
  @('AUT-SC-06', 'Acceso a recurso protegido con JWT valido', 'RNF-02', 'Positivo'),
  @('AUT-SC-07', 'Acceso denegado sin token JWT', 'RNF-02', 'Negativo'),
  @('AUT-SC-08', 'Acceso denegado con JWT invalido, expirado o alterado', 'RNF-02', 'Negativo'),
  @('AUT-SC-09', 'Cierre de sesion invalida el token y bloquea acceso posterior', 'RNF-02', 'Positivo'),
  @('AUT-SC-10', 'Usuario A no puede ver gastos de usuario B sin vinculo familiar aceptado', 'RNF-01', 'Negativo'),
  @('AUT-SC-11', 'Miembro no lider no puede ver gastos de otro miembro (solo lider)', 'RNF-01', 'Negativo'),
  @('AUT-SC-12', 'Login con credenciales incorrectas', 'RF-01', 'Negativo')
)

$dataAut = @(
  @('AUT-DS-01', 'Usuario lider (Familia A)', 'ana.g4.leader1@testmail.com', 'Passw0rd!23', 'Creador de familia; rol Lider'),
  @('AUT-DS-02', 'Usuario miembro (Familia A)', 'bruno.g4.member1@testmail.com', 'Passw0rd!23', 'Miembro invitado y aceptado'),
  @('AUT-DS-03', 'Usuario externo (sin familia)', 'carla.g4.outside@testmail.com', 'Passw0rd!23', 'Sin vinculo familiar con A ni B'),
  @('AUT-DS-04', 'Correo invalido', 'ana..bad@testmail.com', 'Passw0rd!23', 'Doble punto en dominio local'),
  @('AUT-DS-05', 'Contrasena debil', 'diana.g4.weak@testmail.com', '12345', 'Menos de 8 caracteres'),
  @('AUT-DS-06', 'Correo duplicado', 'bruno.g4.member1@testmail.com', 'Passw0rd!23', 'Ya registrado en AUT-DS-02'),
  @('AUT-DS-07', 'Credenciales incorrectas', 'bruno.g4.member1@testmail.com', 'WrongPass99!', 'Password incorrecta'),
  @('AUT-DS-08', 'JWT alterado', '(token capturado)', 'Bearer eyJ...ALTERADO', 'Token modificado manualmente')
)

$casesAut = @(
  @('AUT-CP-001', 'Registro individual exitoso', 'No existe cuenta con correo AUT-DS-01', "1) Abrir pantalla de Registro.`n2) Ingresar correo y contrasena.`n3) Confirmar registro.`n4) Verificar redireccion o confirmacion.", 'Correo: ana.g4.leader1@testmail.com; Password: Passw0rd!23', 'Cuenta creada exitosamente; usuario autenticado o recibe instrucciones de confirmacion segun diseno; sin errores.', ''),
  @('AUT-CP-002', 'Rechazar registro con correo duplicado', 'Existe cuenta activa con AUT-DS-02', "1) Abrir Registro.`n2) Ingresar correo ya registrado.`n3) Confirmar.", 'Correo: bruno.g4.member1@testmail.com; Password: Passw0rd!23', 'Sistema rechaza registro; mensaje claro de correo ya existente; no se crea duplicado en BD.', ''),
  @('AUT-CP-003', 'Validar formato de correo en registro', 'Ninguna cuenta previa', "1) Abrir Registro.`n2) Ingresar correo con formato invalido.`n3) Intentar registrar.", 'Correo: ana..bad@testmail.com; Password: Passw0rd!23', 'Validacion en cliente y/o servidor; mensaje de error; no se crea cuenta.', ''),
  @('AUT-CP-004', 'Validar politica de contrasena en registro', 'Ninguna cuenta previa', "1) Abrir Registro.`n2) Ingresar contrasena debil.`n3) Intentar registrar.", 'Correo: diana.g4.weak@testmail.com; Password: 12345', 'Sistema rechaza; indica requisitos de contrasena; no crea cuenta.', ''),
  @('AUT-CP-005', 'Login exitoso emite JWT utilizable', 'Cuenta AUT-DS-02 activa', "1) Abrir Login.`n2) Ingresar credenciales validas.`n3) Iniciar sesion.`n4) Inspeccionar token en localStorage/cookie/header.", 'Correo: bruno.g4.member1@testmail.com; Password: Passw0rd!23', 'Login exitoso; JWT presente y valido; acceso a vistas protegidas habilitado.', ''),
  @('AUT-CP-006', 'Rechazar login con credenciales incorrectas', 'Cuenta AUT-DS-02 activa', "1) Abrir Login.`n2) Ingresar password incorrecta.`n3) Intentar iniciar sesion.", 'Correo: bruno.g4.member1@testmail.com; Password: WrongPass99!', 'Login fallido; mensaje de error generico; no se emite JWT; no hay fuga de informacion.', ''),
  @('AUT-CP-007', 'Denegar acceso a recurso protegido sin JWT', 'Sesion cerrada / sin token', "1) Abrir endpoint o vista protegida directamente.`n2) Enviar request sin header Authorization.", 'Authorization: (vacio)', 'Respuesta HTTP 401 o 403; redireccion a login; no se expone data.', ''),
  @('AUT-CP-008', 'Denegar acceso con JWT invalido o alterado', 'Ninguna sesion valida', "1) Enviar request a API protegida.`n2) Usar token alterado o expirado.", 'Authorization: Bearer <jwt_alterado>', 'Respuesta 401/403; no se entrega informacion; sesion no se considera valida.', ''),
  @('AUT-CP-009', 'Cierre de sesion invalida acceso posterior', 'Usuario AUT-DS-02 con sesion activa', "1) Iniciar sesion.`n2) Cerrar sesion (logout).`n3) Intentar acceder a vista protegida.", 'Usuario: bruno.g4.member1@testmail.com', 'Token eliminado/invalidado; acceso denegado tras logout; redireccion a login.', ''),
  @('AUT-CP-010', 'Aislamiento: usuario externo no ve gastos de otro sin vinculo', 'AUT-DS-02 y AUT-DS-03 registrados; cada uno con >=1 gasto; sin familia compartida', "1) Login como carla (externa).`n2) Intentar consultar gastos/historial de bruno via API o URL directa.", 'Login: carla.g4.outside@testmail.com; Target: gastos de bruno.g4.member1@testmail.com', '403 o lista vacia; nunca retorna gastos de bruno (RNF-01).', ''),
  @('AUT-CP-011', 'Miembro no lider no ve gastos de otro miembro', 'Familia A con ana (lider) y bruno (miembro); ambos con gastos propios', "1) Login como bruno.`n2) Intentar ver gastos personales de ana (no como lider).", 'Login: bruno.g4.member1@testmail.com; Target: gastos de ana', 'Acceso denegado o solo ve sus propios gastos; no accede a gastos individuales de ana (RNF-01).', ''),
  @('AUT-CP-012', 'Lider puede ver gastos de miembros con membresia aceptada', 'Familia A activa; ana lider; bruno miembro aceptado con gastos', "1) Login como ana (lider).`n2) Acceder a vista de gastos familiares o dashboard familiar.", 'Login: ana.g4.leader1@testmail.com', 'Ana visualiza gastos agregados/de miembros segun diseno del dashboard familiar (RF-07).', '')
)

$row = 1
$row = Write-Title $wsAut $row 'Escenarios de prueba - Autenticacion'
$row = Write-Table $wsAut $row @('ID', 'Escenario', 'Requisito', 'Tipo') $scenariosAut
$row = Write-Title $wsAut $row 'Set de datos - Autenticacion'
$row = Write-Table $wsAut $row @('ID', 'Uso', 'Correo', 'Contrasena', 'Notas') $dataAut
$row = Write-Title $wsAut $row 'Casos de prueba - Autenticacion'
$row = Write-Table $wsAut $row @('ID', 'Nombre', 'Precondiciones', 'Pasos', 'Datos de entrada', 'Resultado esperado', 'Resultado obtenido') $casesAut

# --- Hoja Gastos ---
$wsExp = Ensure-Sheet $wb 'Gestion de Gastos' 3

$scenariosExp = @(
  @('EXP-SC-01', 'Registro de gasto valido con monto, fecha y categoria', 'RF-08', 'Positivo'),
  @('EXP-SC-02', 'Rechazo de monto cero o negativo', 'RF-08', 'Negativo'),
  @('EXP-SC-03', 'Rechazo o advertencia de fecha futura', 'RF-08', 'Negativo'),
  @('EXP-SC-04', 'Rechazo de categoria no permitida o vacia', 'RF-08', 'Negativo'),
  @('EXP-SC-05', 'Configuracion de umbral de alerta de gasto', 'RF-02', 'Positivo'),
  @('EXP-SC-06', 'Gasto sobre umbral genera notificacion en centro de alertas', 'RF-02 / RNF-05', 'Positivo'),
  @('EXP-SC-07', 'Tiempo de procesamiento de alerta menor a 500ms', 'RNF-05', 'Positivo'),
  @('EXP-SC-08', 'Gasto bajo umbral no genera alerta', 'RF-02', 'Negativo'),
  @('EXP-SC-09', 'Registro de multiples gastos mantiene consistencia en historial', 'RF-08', 'Positivo'),
  @('EXP-SC-10', 'Edicion de gasto existente con datos validos', 'RF-08', 'Positivo'),
  @('EXP-SC-11', 'Eliminacion de gasto requiere confirmacion', 'RNF-03', 'Positivo')
)

$dataExp = @(
  @('EXP-DS-01', 'Categorias del sistema', 'Alimentacion; Transporte; Salud; Entretenimiento; Vivienda; Otros', 'Lista segun catalogo del otro grupo'),
  @('EXP-DS-02', 'Gasto normal', 'Monto=25.50; Fecha=2026-06-10; Categoria=Alimentacion; Descripcion=Supermercado', 'Bajo umbral'),
  @('EXP-DS-03', 'Gasto alto (sobre umbral)', 'Monto=250.00; Fecha=2026-06-11; Categoria=Entretenimiento; Descripcion=Cena restaurante', 'Dispara alerta si umbral=200'),
  @('EXP-DS-04', 'Umbral configurado', 'Umbral mensual=200.00; Periodo=Junio 2026; Usuario=bruno.g4.member1@testmail.com', 'RF-02'),
  @('EXP-DS-05', 'Monto cero', 'Monto=0; Fecha=2026-06-10; Categoria=Salud', 'Invalido'),
  @('EXP-DS-06', 'Monto negativo', 'Monto=-10.00; Fecha=2026-06-10; Categoria=Transporte', 'Invalido'),
  @('EXP-DS-07', 'Fecha futura', 'Monto=15.00; Fecha=2027-01-01; Categoria=Transporte', 'Invalido segun regla de negocio'),
  @('EXP-DS-08', 'Categoria vacia', 'Monto=30.00; Fecha=2026-06-12; Categoria=(vacio)', 'Invalido'),
  @('EXP-DS-09', 'Lote de 3 gastos', 'A: 10.00/2026-06-01/Transporte; B: 20.00/2026-06-02/Salud; C: 30.00/2026-06-03/Alimentacion', 'Prueba de consistencia'),
  @('EXP-DS-10', 'Usuario de prueba', 'bruno.g4.member1@testmail.com', 'Passw0rd!23')
)

$casesExp = @(
  @('EXP-CP-001', 'Registrar gasto valido', 'Usuario EXP-DS-10 autenticado; permisos de registro activos', "1) Iniciar sesion.`n2) Ir a Registrar gasto.`n3) Completar monto, fecha y categoria.`n4) Guardar.", 'Monto: 25.50; Fecha: 2026-06-10; Categoria: Alimentacion; Desc: Supermercado', 'Gasto creado en BD; visible en historial; dashboards actualizados.', ''),
  @('EXP-CP-002', 'Rechazar monto igual a cero', 'Usuario autenticado', "1) Ir a Registrar gasto.`n2) Ingresar monto 0.`n3) Guardar.", 'Monto: 0; Fecha: 2026-06-10; Categoria: Salud', 'Validacion impide guardar; mensaje de error; sin registro en BD.', ''),
  @('EXP-CP-003', 'Rechazar monto negativo', 'Usuario autenticado', "1) Ir a Registrar gasto.`n2) Ingresar monto negativo.`n3) Guardar.", 'Monto: -10.00; Fecha: 2026-06-10; Categoria: Transporte', 'Validacion impide guardar; mensaje de error; sin registro en BD.', ''),
  @('EXP-CP-004', 'Rechazar fecha futura', 'Usuario autenticado; regla de negocio prohibe fechas futuras', "1) Ir a Registrar gasto.`n2) Ingresar fecha futura.`n3) Guardar.", 'Monto: 15.00; Fecha: 2027-01-01; Categoria: Transporte', 'Sistema rechaza o solicita confirmacion explicita; no registra silenciosamente.', ''),
  @('EXP-CP-005', 'Rechazar categoria vacia', 'Usuario autenticado', "1) Ir a Registrar gasto.`n2) Dejar categoria sin seleccionar.`n3) Guardar.", 'Monto: 30.00; Fecha: 2026-06-12; Categoria: (vacio)', 'Validacion obliga seleccion de categoria; no se crea gasto.', ''),
  @('EXP-CP-006', 'Configurar umbral de alerta de gasto', 'Usuario autenticado; modulo de alertas disponible', "1) Ir a Configuracion de alertas.`n2) Establecer umbral mensual.`n3) Guardar configuracion.", 'Umbral: 200.00; Periodo: Junio 2026', 'Umbral guardado; persiste tras recargar pagina; aplica al usuario.', ''),
  @('EXP-CP-007', 'Generar alerta al superar umbral', 'Umbral=200.00 configurado; usuario autenticado', "1) Registrar gasto que supere el umbral acumulado del periodo.`n2) Verificar centro de notificaciones.", 'Gasto: 250.00; Fecha: 2026-06-11; Categoria: Entretenimiento', 'Alerta creada; visible en centro de notificaciones (RF-02/RF-03).', ''),
  @('EXP-CP-008', 'Alerta procesada en menos de 500ms', 'Umbral configurado; herramienta de medicion disponible (DevTools/Postman)', "1) Registrar gasto sobre umbral.`n2) Medir tiempo desde click Guardar hasta aparicion de notificacion (UI o timestamp en BD/log).", 'Umbral: 200.00; Gasto: 250.00', 'Tiempo de procesamiento < 500ms (RNF-05).', ''),
  @('EXP-CP-009', 'Gasto bajo umbral no genera alerta', 'Umbral=200.00; gasto acumulado del mes < 200', "1) Registrar gasto pequeno.`n2) Revisar centro de notificaciones.", 'Gasto: 25.50; Fecha: 2026-06-10; Categoria: Alimentacion', 'Gasto registrado; NO se genera alerta de umbral excedido.', ''),
  @('EXP-CP-010', 'Registrar 3 gastos consecutivos sin perdida', 'Usuario autenticado', "1) Registrar gasto A, B y C en secuencia.`n2) Revisar historial y totales.", 'A: 10.00/2026-06-01/Transporte; B: 20.00/2026-06-02/Salud; C: 30.00/2026-06-03/Alimentacion', 'Los 3 gastos presentes; total=60.00; sin duplicados ni omisiones.', ''),
  @('EXP-CP-011', 'Editar gasto existente', 'Al menos 1 gasto registrado (EXP-DS-02)', "1) Abrir historial.`n2) Seleccionar gasto.`n3) Modificar monto.`n4) Guardar.", 'Gasto ID existente; Nuevo monto: 30.00', 'Gasto actualizado; historial refleja cambio; dashboards recalculados.', ''),
  @('EXP-CP-012', 'Eliminar gasto requiere confirmacion', 'Al menos 1 gasto registrado', "1) Seleccionar gasto en historial.`n2) Clic en Eliminar.`n3) Observar dialogo de confirmacion.`n4) Cancelar y verificar que persiste.`n5) Repetir y confirmar eliminacion.", 'Gasto: 25.50 Alimentacion 2026-06-10', 'Paso 3: aparece confirmacion (RNF-03); cancelar no elimina; confirmar si elimina.', '')
)

$row = 1
$row = Write-Title $wsExp $row 'Escenarios de prueba - Gestion de Gastos'
$row = Write-Table $wsExp $row @('ID', 'Escenario', 'Requisito', 'Tipo') $scenariosExp
$row = Write-Title $wsExp $row 'Set de datos - Gestion de Gastos'
$row = Write-Table $wsExp $row @('ID', 'Uso', 'Valores', 'Notas') $dataExp
$row = Write-Title $wsExp $row 'Casos de prueba - Gestion de Gastos'
$row = Write-Table $wsExp $row @('ID', 'Nombre', 'Precondiciones', 'Pasos', 'Datos de entrada', 'Resultado esperado', 'Resultado obtenido') $casesExp

# --- Hoja Dinamica Familiar ---
$wsFam = Ensure-Sheet $wb 'Dinamica Familiar' 4

$scenariosFam = @(
  @('FAM-SC-01', 'Creacion de familia: creador asume rol Lider automaticamente', 'RF-04', 'Positivo'),
  @('FAM-SC-02', 'Invitacion de miembro existente por correo electronico', 'RF-05', 'Positivo'),
  @('FAM-SC-03', 'Invitacion a correo no registrado (si aplica)', 'RF-05', 'Negativo'),
  @('FAM-SC-04', 'Aceptacion de invitacion y vinculacion como miembro', 'RF-06', 'Positivo'),
  @('FAM-SC-05', 'Rechazo de invitacion mantiene aislamiento de datos', 'RF-06 / RNF-01', 'Negativo'),
  @('FAM-SC-06', 'Dashboard Familiar accesible solo para el Lider', 'RF-07', 'Positivo/Negativo'),
  @('FAM-SC-07', 'Miembro aceptado no accede al Dashboard Familiar', 'RF-07', 'Negativo'),
  @('FAM-SC-08', 'Usuario no puede ser Lider de dos familias simultaneamente', 'RNF-06', 'Negativo'),
  @('FAM-SC-09', 'Centro de notificaciones muestra invitaciones pendientes', 'RF-03 / RF-05', 'Positivo'),
  @('FAM-SC-10', 'Abandonar familia requiere confirmacion explicita', 'RNF-03', 'Positivo')
)

$dataFam = @(
  @('FAM-DS-01', 'Familia A', 'Nombre: Familia_A_G4; Descripcion: Familia de prueba Grupo 4', 'Familia principal de pruebas'),
  @('FAM-DS-02', 'Lider Familia A', 'ana.g4.leader1@testmail.com', 'Passw0rd!23'),
  @('FAM-DS-03', 'Miembro invitado', 'bruno.g4.member1@testmail.com', 'Passw0rd!23'),
  @('FAM-DS-04', 'Usuario externo', 'carla.g4.outside@testmail.com', 'Passw0rd!23'),
  @('FAM-DS-05', 'Familia B (intento duplicado)', 'Nombre: Familia_B_G4', 'Para validar RNF-06'),
  @('FAM-DS-06', 'Correo no registrado', 'nuevo.usuario@inexistente.test', 'Invitacion a usuario inexistente'),
  @('FAM-DS-07', 'Invitacion pendiente', 'Estado: pending; Familia: Familia_A_G4; Invitado: bruno', 'RF-05/RF-06')
)

$casesFam = @(
  @('FAM-CP-001', 'Crear familia y asignar rol Lider al creador', 'Usuario FAM-DS-02 autenticado; sin familia previa', "1) Login como ana.`n2) Ir a Gestion de Familia > Crear familia.`n3) Ingresar nombre.`n4) Confirmar creacion.`n5) Verificar rol en perfil/membresia.", 'Nombre: Familia_A_G4', 'Familia creada; ana queda como Lider; membresia propia en estado aceptado (RF-04).', ''),
  @('FAM-CP-002', 'Invitar miembro registrado por correo', 'Familia A creada; ana es Lider; bruno tiene cuenta activa', "1) Login como ana.`n2) Ir a Gestion de Familia > Invitar.`n3) Ingresar correo de bruno.`n4) Enviar invitacion.", 'Invitar: bruno.g4.member1@testmail.com', 'Invitacion creada en estado pendiente; bruno recibe notificacion en centro (RF-05/RF-03).', ''),
  @('FAM-CP-003', 'Manejar invitacion a correo no registrado', 'Familia A creada; ana es Lider', "1) Login como ana.`n2) Intentar invitar correo inexistente.", 'Correo: nuevo.usuario@inexistente.test', 'Sistema informa que el usuario no existe o envia invitacion externa segun diseno; no rompe flujo.', ''),
  @('FAM-CP-004', 'Aceptar invitacion y vincularse a la familia', 'Invitacion pendiente FAM-DS-07 para bruno', "1) Login como bruno.`n2) Abrir Centro de notificaciones.`n3) Aceptar invitacion a Familia_A_G4.`n4) Verificar membresia.", 'Accion: Aceptar invitacion', 'Membresia aceptada; bruno aparece como miembro; accede a funciones de miembro (RF-06).', ''),
  @('FAM-CP-005', 'Rechazar invitacion y mantener aislamiento', 'Nueva invitacion pendiente para bruno (re-enviar si ya acepto)', "1) Login como bruno.`n2) Abrir Centro de notificaciones.`n3) Rechazar invitacion.`n4) Intentar acceder a datos de Familia A.", 'Accion: Rechazar invitacion', 'Invitacion rechazada; bruno no vinculado; no ve gastos familiares (RNF-01).', ''),
  @('FAM-CP-006', 'Lider accede al Dashboard Familiar', 'Familia A activa; ana es Lider; miembros con gastos', "1) Login como ana.`n2) Navegar a Dashboard Familiar.`n3) Verificar graficos y datos agregados.", 'Login: ana.g4.leader1@testmail.com', 'Dashboard carga correctamente; muestra datos familiares consolidados (RF-07).', ''),
  @('FAM-CP-007', 'Miembro no lider no accede al Dashboard Familiar', 'Bruno es miembro aceptado; no es lider', "1) Login como bruno.`n2) Intentar navegar a Dashboard Familiar (menu o URL directa).", 'Login: bruno.g4.member1@testmail.com', 'Acceso denegado (403) o opcion oculta; no se muestran datos del dashboard familiar (RF-07).', ''),
  @('FAM-CP-008', 'Impedir liderazgo simultaneo en dos familias', 'Ana es Lider activa de Familia A', "1) Login como ana.`n2) Intentar crear segunda familia Familia_B_G4.`n3) Observar respuesta.", 'Nombre: Familia_B_G4', 'Operacion rechazada; mensaje claro; ana no queda lider de 2 familias (RNF-06).', ''),
  @('FAM-CP-009', 'Centro de notificaciones lista invitaciones pendientes', 'Invitacion enviada a bruno; estado pending', "1) Login como bruno.`n2) Abrir Centro de notificaciones.`n3) Verificar invitacion visible.", 'Invitacion: Familia_A_G4 de ana', 'Invitacion visible con opciones Aceptar/Rechazar (RF-03).', ''),
  @('FAM-CP-010', 'Abandonar familia requiere confirmacion', 'Bruno es miembro aceptado de Familia A', "1) Login como bruno.`n2) Ir a Gestion de Familia > Abandonar.`n3) Observar dialogo.`n4) Cancelar y verificar permanencia.`n5) Repetir y confirmar.", 'Accion: Abandonar Familia_A_G4', 'Confirmacion obligatoria (RNF-03); cancelar mantiene membresia; confirmar la elimina.', '')
)

$row = 1
$row = Write-Title $wsFam $row 'Escenarios de prueba - Dinamica Familiar'
$row = Write-Table $wsFam $row @('ID', 'Escenario', 'Requisito', 'Tipo') $scenariosFam
$row = Write-Title $wsFam $row 'Set de datos - Dinamica Familiar'
$row = Write-Table $wsFam $row @('ID', 'Uso', 'Dato', 'Notas') $dataFam
$row = Write-Title $wsFam $row 'Casos de prueba - Dinamica Familiar'
$row = Write-Table $wsFam $row @('ID', 'Nombre', 'Precondiciones', 'Pasos', 'Datos de entrada', 'Resultado esperado', 'Resultado obtenido') $casesFam

# Eliminar hojas extra
while ($wb.Worksheets.Count -gt 4) { $wb.Worksheets.Item(5).Delete() }

foreach ($ws in @($wsPort, $wsAut, $wsExp, $wsFam)) {
  $ws.Cells.Font.Name = 'Calibri'
  $ws.Cells.Font.Size = 11
  $ws.Rows.AutoFit() | Out-Null
}

$wb.SaveAs($outPath, 51)
$wb.Close($true)
$excel.Quit()
[System.Runtime.InteropServices.Marshal]::ReleaseComObject($excel) | Out-Null

Write-Output "Archivo generado: $outPath"
