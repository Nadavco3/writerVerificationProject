from flask import Flask
from flask import request
from flask import jsonify
import numpy as np
import cv2
import keras
from keras.models import Model
import matplotlib.pyplot as plt
from preprocessing import *


app = Flask(__name__)

model = keras.models.load_model('modelGoodResults2.h5')

def predictByModel(target,compare):
    target = convert_document_to_patches(target)
    preparePatchesToModel(target)
    print('target ',np.array(target).shape)
    for i in range(len(compare)):
        compare[i] = convert_document_to_patches(compare[i])
        preparePatchesToModel(compare[i])
    print('compare ',np.array(compare[0]).shape)
    results=[]
    for i in range(len(compare)):
        predictions = model.predict([np.array(target),np.array(compare[i])]) > 0.70
        finalResult = np.sum(predictions) / 15 
        results.append(finalResult)
    print(results)
    return jsonify(results)
    

@app.route('/flask', methods=['POST'])
def index():
    targetDoc = request.files['targetDoc'].read()
    targetDoc = np.fromstring(targetDoc, np.uint8)
    targetDoc = cv2.imdecode(targetDoc,cv2.IMREAD_COLOR)
    compareDocs = []
    for file in request.files.getlist('compareDocs'):
        img = file.read()
        img = np.fromstring(img, np.uint8)
        img = cv2.imdecode(img,cv2.IMREAD_COLOR)
        # plt.imshow(img, cmap='gray')
        # plt.show()
        compareDocs.append(img)
    results = predictByModel(targetDoc,compareDocs)

    return results


@app.route('/upload', methods=['POST'])
def index2():
    uploads_dir = os.path.join(app.instance_path, 'models')
    if(not os.path.isdir(uploads_dir)):
        os.makedirs(uploads_dir)
    print(uploads_dir)
    a = request.files.getlist('images')
    results = request.files['targetDoc']
    results.save(os.path.join( uploads_dir , results.filename))

    return "succses"

if __name__ == "__main__":
    app.run(port=5000, debug=True)
