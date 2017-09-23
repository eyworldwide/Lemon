const {app, BrowserWindow} = require('electron');

let win = null;

function createWin(){
	win = new BrowserWindow({width: 800, height: 600});
	win.loadURL(`file://${__dirname}/index.html`);

	win.on('closed', () => {
		win = null;
	});
}

app.on('ready', () => {
	createWin();
});

app.on('window-all-closed', () => {
	if(process.flatform !== 'darwin'){
		app.quit();
	}
});

app.on('activate', () => {
	if(win === null){
		createWin();
	}
});
