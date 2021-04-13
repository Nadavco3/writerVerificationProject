from flask import Flask
from flask import request
import numpy as np
import cv2
import matplotlib.pyplot as plt
from preprocessing import *


app = Flask(__name__)

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
    # img = remove_yellow(img)
    # patches = convert_document_to_patches(img)
    return "Welcome to Flask Server"

if __name__ == "__main__":
    app.run(port=5000, debug=True)
