const fs = require('fs')
const imagemin = require('imagemin')
const imageminPngquant = require('imagemin-pngquant')

let container = document.createElement('div')
let docfrag = document.createDocumentFragment()
let path = null
let rows = null

function render(file, originalPath){
	let row = document.createElement('div')
	row.classList.add('tr')
	row.setAttribute('data-path', file.path)
	row.setAttribute('data-original-path', originalPath)

	// name
	let name = document.createElement('div')
	name.classList.add('td')
	row.appendChild(name)
	name.textContent = /[^/]*$/.exec(file.path)[0]
	
	// size
	let size = document.createElement('div')
	size.classList.add('td')
	row.appendChild(size)
	let compressedSize = getFilesizeInKB(file.path) 
	size.textContent = toStringKB(compressedSize)

	// save
	let save = document.createElement('div')
	save.classList.add('td')
	row.appendChild(save)
	let originalBytes = getFilesizeInKB(originalPath)
	save.textContent = toPercent(compressedSize / originalBytes)

	docfrag.appendChild(row)
	container.appendChild(docfrag)
}

function toPercent(num){
	return ((num * 100) >> 0) + '%'
}

function toStringKB(num){
	return num.toFixed(1) + 'KB'
}
function getFilesizeInKB(filename) {
	const stats = fs.statSync(filename)
	const fileSizeInBytes = (stats.size / 1024)
	return fileSizeInBytes
}

function bindDrop(){
	window.addEventListener('dragover', (e) => {
		e.preventDefault()
	},false)

	window.addEventListener('drop', (e) => {
		e.preventDefault()
		path = e.dataTransfer.files[0].path
		compress()
	},false)
}

function bindSelect(){
	let quality = document.querySelector('#quality')

	quality.onchange = compress
}

function compress(){
	let select = document.querySelector('#quality')

	let quality = '0-' + parseInt(select.options[select.selectedIndex].text)

	imagemin([path + '/*.png'], path + '_compressed', {use: [imageminPngquant({quality: quality})]}).then((files) => {
		files.forEach((file) => {
			render(file, file.path.replace('_compressed', ''))
		})
	})

	rows.appendChild(container)

	container.innerHTML = ''
}

function bindMouseEnter(){
	rows = document.querySelector('#rows')
	let previewOriginalImg = document.querySelector('#preview-original-img')
	let previewCompressedImg = document.querySelector('#preview-compressed-img')
	let preview = document.querySelector('#preview')
	let currentRow; 
	let show = false

	rows.addEventListener('mouseleave', (e) => {
		show = false
		preview.style.display = 'none'
	})

	rows.addEventListener('mousemove', (e) => {
		if(!show){
			preview.style.display = 'block'
			show = true
		}

		preview.style.edisplay = 'block'

		let target = e.target;

		while(!target.matches('.tr')){
			target = target.parentNode
		}
		
		if(currentRow !== target){
			currentRow = target

			previewCompressedImg.src  = target.getAttribute('data-path')
			previewOriginalImg.src = target.getAttribute('data-original-path')
		}

		preview.style.transform = 'translate(' + (e.clientX+10) + 'px,'+ (10+e.clientY) + 'px)' 
	})
}

window.onload = () => {
	bindDrop()
	bindSelect()
	bindMouseEnter()
}
