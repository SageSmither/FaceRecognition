const video = document.getElementById('videoInput')

const list_attendance = []
Promise.all([
    faceapi.nets.faceRecognitionNet.loadFromUri('/models'),
    faceapi.nets.faceLandmark68Net.loadFromUri('/models'),
    faceapi.nets.ssdMobilenetv1.loadFromUri('/models') //heavier/accurate version of tiny face detector
]).then(start)

function start() {
    document.body.append('Models Loaded')
    
    navigator.getUserMedia(
        { video:{} },
        stream => video.srcObject = stream,
        err => console.error(err)
    )
    console.log('video added')
    recognizeFaces()
}
const DISTANCE=0.6
async function recognizeFaces() {

    const labeledDescriptors = await loadLabeledImages()
    console.log(labeledDescriptors)
    const faceMatcher = new faceapi.FaceMatcher(labeledDescriptors, 0.7)

    video.addEventListener('play', async () => {
        console.log('Playing')
        const canvas = faceapi.createCanvasFromMedia(video)
        document.body.append(canvas)

        const displaySize = { width: video.width, height: video.height }
        faceapi.matchDimensions(canvas, displaySize)

        setInterval(async () => {
            const detections = await faceapi.detectAllFaces(video).withFaceLandmarks().withFaceDescriptors()

            const resizedDetections = faceapi.resizeResults(detections, displaySize)

            canvas.getContext('2d').clearRect(0, 0, canvas.width, canvas.height)

            const results = resizedDetections?.map((d) => {
                return faceMatcher.findBestMatch(d.descriptor)
            }) 
            console.log(results[0]?._distance);
            if (results[0]?._distance <= DISTANCE){                
                results.forEach( (result, i) => {
                    let check = list_attendance.every(e=> e.name !== result._label)
                    if (check && result._label!=='unknown'){
                        console.log(result._label);
                        list_attendance.push({name: result._label, time: new Date()})
                        localStorage.setItem("list_attendance", JSON.stringify(list_attendance))
                    }
                    const box = resizedDetections[i].detection.box
                    const drawBox = new faceapi.draw.DrawBox(box, { label: result.toString() })
                    drawBox.draw(canvas)
                })
            }else {
                const box = resizedDetections[0].detection.box
                const drawBox = new faceapi.draw.DrawBox(box, { label: 'unknown' })
                drawBox.draw(canvas)
            }
        }, 100)
        
    })
}


function loadLabeledImages() {
    const labels = ['Son Tung', 'Thor'] 
    return Promise.all(
        labels.map(async (label)=>{
            const descriptions = []
            for(let i=1; i<=10; i++) {
                const img = await faceapi.fetchImage(`../labeled_images/${label}/${i}.jpg`)
                const detections = await faceapi.detectSingleFace(img).withFaceLandmarks().withFaceDescriptor()
                descriptions.push(detections.descriptor)
            }
            return new faceapi.LabeledFaceDescriptors(label, descriptions)
        })
    )
}