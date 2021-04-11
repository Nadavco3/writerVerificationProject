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
    print(request.files[0])
    compareDocs = request.files['compareDocs'][0].read()
    npimg = np.fromstring(compareDocs, np.uint8)
    img = cv2.imdecode(npimg,cv2.IMREAD_COLOR)
    img = remove_yellow(img)
    patches = convert_document_to_patches(img)
    plt.imshow(img, cmap='gray')
    # for i in range(len(patches)):
    #     plt.imshow(patches[i], cmap='gray')
    #     plt.show()
    return "Welcome to Flask Server"

if __name__ == "__main__":
    app.run(port=5000, debug=True)
