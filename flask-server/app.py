from flask import Flask
from flask import request
from flask import jsonify
from PIL import Image
import numpy as np
import cv2
import keras
from keras.models import Model
import matplotlib.pyplot as plt
from preprocessing import *
from flask import jsonify
import shutil


app = Flask(__name__)



def predictByModel(target,compare,model):
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
def verifyWriter():
    modelName = request.form['model']
    userID = request.form['id']
    targetDoc = request.files['targetDoc'].read()
    targetDoc = np.fromstring(targetDoc, np.uint8)
    targetDoc = cv2.imdecode(targetDoc,cv2.IMREAD_COLOR)
    targetDoc = cv2.resize(targetDoc,(targetDoc.shape[1],targetDoc.shape[0]))
    points = request.form['targetPoints'].split(',')
    targetDoc = targetDoc[int(points[1]):int(points[3]),int(points[0]):int(points[2])]
    compareDocs = []
    cmpr_points_array = request.form.getlist('comparePoints')
    i=0
    for file in request.files.getlist('compareDocs'):
        img = file.read()
        img = np.fromstring(img, np.uint8)
        img = cv2.imdecode(img,cv2.IMREAD_COLOR)
        img = cv2.resize(img,(img.shape[1],img.shape[0]))
        points = cmpr_points_array[i].split(',')
        i+=1
        img = img[int(points[1]):int(points[3]),int(points[0]):int(points[2])]
        compareDocs.append(img)
    if(modelName == 'Default-model'):
        mdl_uploads_dir = os.path.join(app.instance_path[:len(app.instance_path)-8],'default-model')
        model = keras.models.load_model(mdl_uploads_dir + '/'  + os.listdir(mdl_uploads_dir)[0])
    else:
        model = keras.models.load_model(os.path.join(app.instance_path,  'models' + '/' + userID + '/' + modelName ))
    results = predictByModel(targetDoc,compareDocs,model)
    return results


@app.route('/upload', methods=['POST'])
def uploadModel():
    uploads_dir = os.path.join(app.instance_path,  'models' + '/' + request.form['id'])
    if(not os.path.isdir(uploads_dir)):
        os.makedirs(uploads_dir)
    modelFile = request.files['model']
    modelFile.save(os.path.join( uploads_dir , modelFile.filename))
    return "Uploaded to flask succesfully"


@app.route('/get-user-models', methods=['POST'])
def getModels():
    usr_uploads_dir = os.path.join(app.instance_path,  'models' + '/' + request.form['id'])
    if(not os.path.isdir(usr_uploads_dir)):
        os.makedirs(usr_uploads_dir)
    return jsonify(os.listdir(usr_uploads_dir))

@app.route('/delete-model', methods=['POST'])
def deleteModel():
    usr_uploads_dir = os.path.join(app.instance_path,  'models' + '/' + request.form['id'])
    if(not os.path.isdir(usr_uploads_dir)):
        return "Error"
    os.remove(usr_uploads_dir + "/"  + request.form['modelName'])
    return jsonify(os.listdir(usr_uploads_dir))


@app.route('/upload-default', methods=['POST'])
def uploadDefualtModel():
    modelFile = request.files['model']  
    mdl_uploads_dir = os.path.join(app.instance_path[:len(app.instance_path)-8],'default-model')
    os.remove(mdl_uploads_dir + "/"  + os.listdir(mdl_uploads_dir)[0])
    modelFile.save(os.path.join(mdl_uploads_dir , 'default-model.h5'))
    return "success"

@app.route('/delete-user-models', methods=['POST'])
def deleteAllModels():
    usr_uploads_dir = os.path.join(app.instance_path,  'models' + '/' + request.form['id'])
    if(not os.path.isdir(usr_uploads_dir)):
        return "Error"
    shutil.rmtree(usr_uploads_dir)
    return "Succefully deleted"


if __name__ == "__main__":
    app.run(port=5000, debug=True)
