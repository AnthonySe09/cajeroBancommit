// =======================================
// CLASES PARA LA LÓGICA DE CUENTAS Y CLIENTES
// =======================================

// Clase base Cuenta: representa una cuenta bancaria genérica
class Cuenta {
    constructor(numeroCuenta, saldoInicial = 0) {
        this.numeroCuenta = numeroCuenta;       // identificador de cuenta
        this.saldo = saldoInicial;               // saldo actual
        this.movimientos = [];                   // historial de operaciones
    }

    consultarSaldo() {
        return this.saldo;
    }

    realizarDeposito(monto) {
        if (monto > 0) {
            this.saldo += monto;
            this.movimientos.push({
                tipo: 'Depósito',
                monto,
                fecha: new Date().toLocaleString()
            });
            return true;
        }
        return false;
    }

    realizarRetiro(monto) {
        // implementación base: no permite sobregiro
        if (monto > 0 && monto <= this.saldo) {
            this.saldo -= monto;
            this.movimientos.push({
                tipo: 'Retiro',
                monto,
                fecha: new Date().toLocaleString()
            });
            return true;
        }
        return false;
    }

    consultarMovimientos() {
        return this.movimientos;
    }
}

// Clase CuentaAhorros: hereda de Cuenta, igual lógica de retiro que la base
class CuentaAhorros extends Cuenta {
    constructor(numeroCuenta, saldoInicial = 0) {
        super(numeroCuenta, saldoInicial);
    }

    // opcional: sobrescribir retirar con misma lógica (no sobregiro)
    realizarRetiro(monto) {
        if (monto > 0 && monto <= this.saldo) {
            this.saldo -= monto;
            this.movimientos.push({
                tipo: 'Retiro',
                monto,
                fecha: new Date().toLocaleString()
            });
            return true;
        }
        return false;
    }
}

// Clase CuentaCorriente: permite sobregiro hasta un límite
class CuentaCorriente extends Cuenta {
    constructor(numeroCuenta, saldoInicial = 0) {
        super(numeroCuenta, saldoInicial);
        this.limiteSobregiro = 500000;  // monto máximo de sobregiro permitido
    }

    realizarRetiro(monto) {
        // permite que saldo llegue a negativo hasta -limiteSobregiro
        if (monto > 0 && (this.saldo - monto) >= -this.limiteSobregiro) {
            this.saldo -= monto;
            this.movimientos.push({
                tipo: 'Retiro',
                monto,
                fecha: new Date().toLocaleString()
            });
            return true;
        }
        return false;
    }

    consultarSaldo() {
        // Puede devolver saldo negativo si hay sobregiro
        return this.saldo;
    }
}

// Clase Cliente: representa un usuario con sus datos y sus cuentas
class Cliente {
    constructor(nombre, apellido, direccion, numeroIdentificacion, usuario, contrasena) {
        this.nombre = nombre;
        this.apellido = apellido;
        this.direccion = direccion;
        this.numeroIdentificacion = numeroIdentificacion;
        this.usuario = usuario;
        this.contrasena = contrasena;

        // Se crean dos cuentas: ahorros y corriente
        this.cuentas = {
            ahorros: new CuentaAhorros(`AH${Date.now()}`),
            corriente: new CuentaCorriente(`CC${Date.now()}`)
        };
    }

    consultarSaldo(tipoCuenta = 'ahorros') {
        return this.cuentas[tipoCuenta].consultarSaldo();
    }

    realizarDeposito(monto, tipoCuenta = 'ahorros') {
        return this.cuentas[tipoCuenta].realizarDeposito(monto);
    }

    realizarRetiro(monto, tipoCuenta = 'ahorros') {
        return this.cuentas[tipoCuenta].realizarRetiro(monto);
    }

    consultarMovimientos(tipoCuenta = 'ahorros') {
        return this.cuentas[tipoCuenta].consultarMovimientos();
    }

    transferir(monto, tipoOrigen, tipoDestino) {
        // intenta retirar de la cuenta origen; si tiene éxito, deposita en la cuenta destino
        if (this.realizarRetiro(monto, tipoOrigen)) {
            this.realizarDeposito(monto, tipoDestino);
            return true;
        }
        return false;
    }

    actualizarPerfil(nombre, apellido, direccion) {
        this.nombre = nombre;
        this.apellido = apellido;
        this.direccion = direccion;
    }
}

// =======================================
// VARIABLES GLOBALES (simulación de base de datos local)
// =======================================

let clientes = [];           // lista de clientes registrados
let clienteActual = null;    // cliente que ha iniciado sesión
let intentosLogin = 0;
const MAX_INTENTOS = 3;

// =======================================
// INICIALIZACIÓN Y EVENTOS AL CARGAR LA PÁGINA
// =======================================

document.addEventListener('DOMContentLoaded', function() {
    // Si no hay clientes, se agrega uno de prueba
    if (clientes.length === 0) {
        const clienteEjemplo = new Cliente(
            'Juan', 'Pérez',
            'Calle 123', '123456789',
            'juanp', 'password123'
        );
        // Hacer algunos depósitos iniciales
        clienteEjemplo.cuentas.ahorros.realizarDeposito(1000000);
        clienteEjemplo.cuentas.corriente.realizarDeposito(500000);
        clientes.push(clienteEjemplo);
    }

    // Asignar manejadores de eventos a formularios y botones de UI
    document.getElementById('loginForm').addEventListener('submit', handleLogin);
    document.getElementById('registerForm').addEventListener('submit', handleRegister);
    document.getElementById('showRegister').addEventListener('click', showRegister);
    document.getElementById('showLogin').addEventListener('click', showLogin);
    document.getElementById('logoutBtn').addEventListener('click', logout);
    document.getElementById('editProfileBtn').addEventListener('click', showEditProfile);
    document.getElementById('editProfileForm').addEventListener('submit', handleEditProfile);
    document.getElementById('cancelEdit').addEventListener('click', cancelEdit);

    // Botones de operaciones bancarias
    document.getElementById('depositBtn').addEventListener('click', () => showOperationModal('deposit'));
    document.getElementById('withdrawBtn').addEventListener('click', () => showOperationModal('withdraw'));
    document.getElementById('balanceBtn').addEventListener('click', () => showOperationModal('balance'));
    document.getElementById('historyBtn').addEventListener('click', () => showOperationModal('history'));
    document.getElementById('transferBtn').addEventListener('click', () => showOperationModal('transfer'));

    // Cerrar modal: al hacer clic en elementos con clase 'close'
    document.querySelectorAll('.close').forEach(close =>
        close.addEventListener('click', closeModal)
    );
    // También cerrar modal si se hace clic fuera del contenido (sobre el fondo del modal)
    window.addEventListener('click', (e) => {
        if (e.target.classList.contains('modal')) {
            closeModal();
        }
    });
});

// =======================================
// FUNCIONES DE INTERFAZ / UI
// =======================================

function showScreen(screenId) {
    // Oculta todas las secciones (pantallas) quitándoles clases visuales
    document.querySelectorAll('.screen').forEach(screen =>
        screen.classList.remove('active', 'hidden')
    );
    // Agrega clase 'active' a la sección que queremos mostrar
    document.getElementById(screenId).classList.add('active');
}

function showRegister(e) {
    e.preventDefault(); // prevenir comportamiento por defecto (por ejemplo, recargar la página)
    showScreen('registerScreen');
}

function showLogin(e) {
    e.preventDefault();
    showScreen('loginScreen');
    intentosLogin = 0;
    document.getElementById('loginAttempts').classList.add('hidden');
}

function showTransactions() {
    showScreen('transactionsScreen');
    document.getElementById('userName').textContent = `${clienteActual.nombre} ${clienteActual.apellido}`;
    document.getElementById('profileNombre').textContent = `${clienteActual.nombre} ${clienteActual.apellido}`;
    document.getElementById('profileDireccion').textContent = clienteActual.direccion;
    updateAccountsList();
}

function updateAccountsList() {
    const list = document.getElementById('accountsList');
    list.innerHTML = ''; // limpia el contenido previo

    // Cuenta de Ahorros
    const saldoAhorros = clienteActual.consultarSaldo('ahorros');
    const itemAhorros = document.createElement('div');
    itemAhorros.className = 'account-item';
    itemAhorros.innerHTML = `
        <p><strong>Cuenta Ahorros (${clienteActual.cuentas.ahorros.numeroCuenta})</strong></p>
        <p>Saldo: $${saldoAhorros.toLocaleString('es-CO')}</p>
    `;
    list.appendChild(itemAhorros);

    // Cuenta Corriente
    const saldoCorriente = clienteActual.consultarSaldo('corriente');
    const itemCorriente = document.createElement('div');
    itemCorriente.className = 'account-item';
    itemCorriente.innerHTML = `
        <p><strong>Cuenta Corriente (${clienteActual.cuentas.corriente.numeroCuenta})</strong></p>
        <p>Saldo: $${saldoCorriente.toLocaleString('es-CO')} ${saldoCorriente < 0 ? '(Sobregiro)' : ''}</p>
    `;
    list.appendChild(itemCorriente);
}

function handleLogin(e) {
    e.preventDefault();
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;
    const attemptsDiv = document.getElementById('loginAttempts');

    if (intentosLogin >= MAX_INTENTOS) {
        attemptsDiv.textContent = 'Demasiados intentos fallidos. Espere o reinicie.';
        attemptsDiv.classList.remove('hidden');
        return;
    }

    const cliente = clientes.find(c => c.usuario === username && c.contrasena === password);
    if (cliente) {
        clienteActual = cliente;
        intentosLogin = 0;
        showTransactions();
    } else {
        intentosLogin++;
        attemptsDiv.textContent = `Credenciales incorrectas. Intentos restantes: ${MAX_INTENTOS - intentosLogin}`;
        attemptsDiv.classList.remove('hidden');
        if (intentosLogin >= MAX_INTENTOS) {
            setTimeout(() => {
                showLogin(null);
            }, 30000);
        }
    }
}

function handleRegister(e) {
    e.preventDefault();
    const nombre = document.getElementById('regNombre').value;
    const apellido = document.getElementById('regApellido').value;
    const direccion = document.getElementById('regDireccion').value;
    const identificacion = document.getElementById('regIdentificacion').value;
    const usuario = document.getElementById('regUsuario').value;
    const contrasena = document.getElementById('regPassword').value;
    const errorDiv = document.getElementById('registerError');

    if (clientes.find(c => c.usuario === usuario)) {
        errorDiv.textContent = 'El usuario ya existe. Elija otro.';
        errorDiv.classList.remove('hidden');
        return;
    }

    const nuevoCliente = new Cliente(nombre, apellido, direccion, identificacion, usuario, contrasena);
    clientes.push(nuevoCliente);
    errorDiv.textContent = 'Registro exitoso. Puede iniciar sesión.';
    errorDiv.classList.remove('hidden');
    errorDiv.style.color = 'green';
    setTimeout(() => {
        showLogin(null);
        document.getElementById('registerForm').reset();
    }, 2000);
}

function logout() {
    clienteActual = null;
    showScreen('loginScreen');
    document.getElementById('loginForm').reset();
    document.getElementById('loginAttempts').classList.add('hidden');
}

function showEditProfile() {
    document.getElementById('editNombre').value = clienteActual.nombre;
    document.getElementById('editApellido').value = clienteActual.apellido;
    document.getElementById('editDireccion').value = clienteActual.direccion;
    showScreen('editProfileScreen');
}

function handleEditProfile(e) {
    e.preventDefault();
    const nombre = document.getElementById('editNombre').value;
    const apellido = document.getElementById('editApellido').value;
    const direccion = document.getElementById('editDireccion').value;

    clienteActual.actualizarPerfil(nombre, apellido, direccion);
    showTransactions(); // vuelve a la pantalla principal y actualiza los datos
}

function cancelEdit() {
    showTransactions();
}

// Mostrar el modal de operación (depósito, retiro, consulta, historial o transferencia)
function showOperationModal(operation) {
    const modal = document.getElementById('operationModal');
    const body = document.getElementById('modalBody');
    body.innerHTML = '';  // limpiar contenido previo

    let html = '';
    switch (operation) {
        case 'deposit':
            html = `
                <h3>Depositar</h3>
                <form id="depositForm">
                    <div class="input-group">
                        <label for="depositAmount">Monto a depositar:</label>
                        <input type="number" id="depositAmount" min="1" required>
                    </div>
                    <div class="input-group">
                        <label for="depositAccount">Tipo de cuenta:</label>
                        <select id="depositAccount">
                            <option value="ahorros">Ahorros</option>
                            <option value="corriente">Corriente</option>
                        </select>
                    </div>
                    <button type="submit">Depositar</button>
                </form>
            `;
            body.innerHTML = html;
            document.getElementById('depositForm').addEventListener('submit', handleDeposit);
            break;

        case 'withdraw':
            html = `
                <h3>Retirar</h3>
                <form id="withdrawForm">
                    <div class="input-group">
                        <label for="withdrawAmount">Monto a retirar:</label>
                        <input type="number" id="withdrawAmount" min="1" required>
                    </div>
                    <div class="input-group">
                        <label for="withdrawAccount">Tipo de cuenta:</label>
                        <select id="withdrawAccount">
                            <option value="ahorros">Ahorros</option>
                            <option value="corriente">Corriente</option>
                        </select>
                    </div>
                    <button type="submit">Retirar</button>
                </form>
            `;
            body.innerHTML = html;
            document.getElementById('withdrawForm').addEventListener('submit', handleWithdraw);
            break;

        case 'balance':
            const saldoAhorros = clienteActual.consultarSaldo('ahorros');
            const saldoCorriente = clienteActual.consultarSaldo('corriente');
            html = `
                <h3>Consulta de Saldo</h3>
                <p><strong>Ahorros (${clienteActual.cuentas.ahorros.numeroCuenta}):</strong> $${saldoAhorros.toLocaleString('es-CO')}</p>
                <p><strong>Corriente (${clienteActual.cuentas.corriente.numeroCuenta}):</strong> $${saldoCorriente.toLocaleString('es-CO')} ${saldoCorriente < 0 ? '(Sobregiro)' : ''}</p>
                <button id="closeBalance">Cerrar</button>
            `;
            body.innerHTML = html;
            document.getElementById('closeBalance').addEventListener('click', closeModal);
            showResultModal('Consulta de Saldo', html);
            return;

        case 'history':
            const movimientosAhorros = clienteActual.consultarMovimientos('ahorros');
            const movimientosCorriente = clienteActual.consultarMovimientos('corriente');
            html = `
                <h3>Historial de Movimientos</h3>
                <h4>Ahorros:</h4>
                <ul id="historyAhorros"></ul>
                <h4>Corriente:</h4>
                <ul id="historyCorriente"></ul>
                <button id="closeHistory">Cerrar</button>
            `;
            body.innerHTML = html;
            const ulAhorros = document.getElementById('historyAhorros');
            const ulCorriente = document.getElementById('historyCorriente');
            movimientosAhorros.forEach(mov => {
                const li = document.createElement('li');
                li.textContent = `${mov.fecha}: ${mov.tipo} de $${mov.monto.toLocaleString('es-CO')}`;
                ulAhorros.appendChild(li);
            });
            movimientosCorriente.forEach(mov => {
                const li = document.createElement('li');
                li.textContent = `${mov.fecha}: ${mov.tipo} de $${mov.monto.toLocaleString('es-CO')}`;
                ulCorriente.appendChild(li);
            });
            document.getElementById('closeHistory').addEventListener('click', closeModal);
            showResultModal('Historial de Movimientos', body.innerHTML);
            return;

        case 'transfer':
            html = `
                <h3>Transferir</h3>
                <form id="transferForm">
                    <div class="input-group">
                        <label for="transferAmount">Monto a transferir:</label>
                        <input type="number" id="transferAmount" min="1" required>
                    </div>
                    <div class="input-group">
                        <label for="fromAccount">De cuenta:</label>
                        <select id="fromAccount">
                            <option value="ahorros">Ahorros</option>
                            <option value="corriente">Corriente</option>
                        </select>
                    </div>
                    <div class="input-group">
                        <label for="toAccount">A cuenta:</label>
                        <select id="toAccount">
                            <option value="corriente">Corriente</option>
                            <option value="ahorros">Ahorros</option>
                        </select>
                    </div>
                    <button type="submit">Transferir</button>
                </form>
            `;
            body.innerHTML = html;
            document.getElementById('transferForm').addEventListener('submit', handleTransfer);
            break;
    }

    modal.classList.remove('hidden');
    modal.classList.add('active');
}

function handleDeposit(e) {
    e.preventDefault();
    const monto = parseFloat(document.getElementById('depositAmount').value);
    const tipoCuenta = document.getElementById('depositAccount').value;

    if (clienteActual.realizarDeposito(monto, tipoCuenta)) {
        showResultModal('Depósito Exitoso', `Se depositaron $${monto.toLocaleString('es-CO')} en la cuenta ${tipoCuenta}.`);
        updateAccountsList();
    } else {
        showResultModal('Error en Depósito', 'Monto inválido. Intente nuevamente.');
    }
    closeModal();
    document.getElementById('depositForm').reset();
}

function handleWithdraw(e) {
    e.preventDefault();
    const monto = parseFloat(document.getElementById('withdrawAmount').value);
    const tipoCuenta = document.getElementById('withdrawAccount').value;

    if (clienteActual.realizarRetiro(monto, tipoCuenta)) {
        showResultModal('Retiro Exitoso', `Se retiraron $${monto.toLocaleString('es-CO')} de la cuenta ${tipoCuenta}.`);
        updateAccountsList();
    } else {
        showResultModal('Error en Retiro', `Fondos insuficientes o sobregiro no permitido en ${tipoCuenta}.`);
    }
    closeModal();
    document.getElementById('withdrawForm').reset();
}

function handleTransfer(e) {
    e.preventDefault();
    const monto = parseFloat(document.getElementById('transferAmount').value);
    const origen = document.getElementById('fromAccount').value;
    const destino = document.getElementById('toAccount').value;

    if (clienteActual.transferir(monto, origen, destino)) {
        showResultModal('Transferencia Exitosa', `Se transfirieron $${monto.toLocaleString('es-CO')} de ${origen} a ${destino}.`);
        updateAccountsList();
    } else {
        showResultModal('Error en Transferencia', 'Fondos insuficientes en la cuenta origen.');
    }
    closeModal();
    document.getElementById('transferForm').reset();
}

function showResultModal(title, message) {
    document.getElementById('resultTitle').textContent = title;
    document.getElementById('resultMessage').innerHTML = message;
    const modal = document.getElementById('resultModal');
    modal.classList.remove('hidden');
    modal.classList.add('active');
}

function closeModal() {
    const opModal = document.getElementById('operationModal');
    const resModal = document.getElementById('resultModal');
    opModal.classList.remove('active');
    opModal.classList.add('hidden');
    resModal.classList.remove('active');
    resModal.classList.add('hidden');
    // Limpiar formularios dentro del modal de operación si existen
    const forms = opModal.querySelectorAll('form');
    forms.forEach(form => form.reset());
}
