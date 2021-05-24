#!/usr/bin/env python
# coding: utf-8

# In[1]:


##get_ipython().run_line_magic('matplotlib', 'inline')
import sys
import cv2
import os
import matplotlib.pyplot as plt
import numpy as np
import random
import skimage as sk
from random import randint
import math
from PIL import Image
import pandas as pd
from keras.preprocessing.image import ImageDataGenerator
from pandas import ExcelWriter
from pandas import ExcelFile
from itertools import combinations


# In[2]:


def blur_filter(img_array):
    # blur the image
    ksize = math.floor(random.random()*8)+8
    return cv2.blur(img_array, (ksize, ksize))

def reduce_line_thickness(image):
    randval = math.floor(random.random()*3)+3
    kernel = np.ones((randval,randval), np.uint8)
    return cv2.dilate(image, kernel, iterations=1)

def all_filters(image):
    img = blur_filter(image)
    img = reduce_line_thickness(img)
    return img

def random_stretch(img):
    stretch = (random.random() - 0.5)  # -0.5 .. +0.5
    wStretched = max(int(img.shape[1] * (1 + stretch)), 1)  # random width, but at least 1
    img = cv2.resize(img, (wStretched, img.shape[0]))  # stretch horizontally by factor 0.5 .. 1.5
    print(img.shape)
    return img

def applyAugmentation(img):
    
    img = img.reshape(1,img.shape[0],img.shape[1],1)
    datagen = ImageDataGenerator(rotation_range=15, fill_mode='nearest')
    aug_iter = datagen.flow(img, batch_size=1)
    
    image1 = next(aug_iter)[0].astype('uint8')
    image2 = next(aug_iter)[0].astype('uint8')
    image3 = next(aug_iter)[0].astype('uint8')
    #image = blur_filter(image)
    #image = reduce_line_thickness(image)
    
    return image1,image2,image3


def getGroupNumber(doc_name,temp): 
    index = temp[0].index(doc_name)
    return temp[1][index]

def generateAugImages():
    path_dir = './only_text_docs'
    document_name_list = os.listdir(path_dir)
    df = pd.read_excel('./excelFiles/Writers-set.xlsx',engine='openpyxl')
    temp = []
    for column_name, column in df.transpose().iterrows():
        temp.append(column)
    temp[0] = list(temp[0])
    temp[1] = list(temp[1])
    imageName = []
    groupNum = []
    for doc_name in document_name_list:
        print(doc_name)
        try:
            group = getGroupNumber(doc_name,temp)
            new_doc_name1 = doc_name[:len(doc_name)-4] + "_1_Aug.tif"
            new_doc_name2 = doc_name[:len(doc_name)-4] + "_2_Aug.tif"
            new_doc_name3 = doc_name[:len(doc_name)-4] + "_3_Aug.tif"
            imageName.append(new_doc_name1)
            groupNum.append(group)
            imageName.append(new_doc_name2)
            groupNum.append(group)
            imageName.append(new_doc_name3)
            groupNum.append(group)
            img = cv2.imread(path_dir + "/" + doc_name,cv2.IMREAD_GRAYSCALE)
            img1,img2,img3 = applyAugmentation(img)
            cv2.imwrite(path_dir + "/" + new_doc_name1,img1)
            cv2.imwrite(path_dir + "/" + new_doc_name2,img2)
            cv2.imwrite(path_dir + "/" + new_doc_name3,img3)
        except:
            print("error")
        
    df = pd.DataFrame({"Image Name":temp[0]+imageName,"Group":temp[1]+groupNum})
    writer = ExcelWriter('./excelFiles/writer-set-aug.xlsx')
    df.to_excel(writer,'Sheet1',index=False)
    writer.save()

def calc_angle(points_x, points_y):
    # Calculating the angle of the image rotation.
    # according to the squares parameters.
    if points_x[0] < points_x[1]:
        y = points_y[0]
        points_y[0] = points_y[1]
        points_y[1] = y

    a = abs(points_y[1] - points_y[0])
    b = abs(points_x[1] - points_x[0])
    c = math.sqrt(a * a + b * b)
    angle = math.acos(a / c)
    angle = 90 - math.degrees(angle)

    if points_y[1] > points_y[0]:
        return -angle
    else:
        return angle

def find_squares2(img_bgr):
    location = []
    img = img_bgr
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    ret, thresh = cv2.threshold(gray, 0, 255, cv2.THRESH_BINARY_INV + cv2.THRESH_OTSU)
    
    # noise removal
    kernel = np.ones((3, 3), np.uint8)
    opening = cv2.morphologyEx(thresh, cv2.MORPH_OPEN, kernel, iterations=2)

    # sure background area
    sure_bg = cv2.dilate(opening, kernel, iterations=3)
    # Finding sure foreground area
    dist_transform = cv2.distanceTransform(opening, cv2.DIST_L2, 5)
    ret, sure_fg = cv2.threshold(dist_transform, 0.7 * dist_transform.max(), 255, 0)
    # Finding unknown region
    sure_fg = np.uint8(sure_fg)
    unknown = cv2.subtract(sure_bg, sure_fg)

    # Marker labelling
    marker_count, markers = cv2.connectedComponents(sure_fg)
    # Add one to all labels so that sure background is not 0, but 1
    markers = markers + 1
    # Now, mark the region of unknown with zero
    markers[unknown == 255] = 0

    segmented = cv2.watershed(img, markers)

    # END of original watershed example

    output = np.zeros_like(img)
    output2 = img.copy()
    xmin,xmax,ymax=1000000,0,0

    # Iterate over all non-background labels
    for i in range(2, marker_count + 1):
        mask = np.where(segmented == i, np.uint8(255), np.uint8(0))
        x, y, w, h = cv2.boundingRect(mask)
        area = cv2.countNonZero(mask[y:y + h, x:x + w])
        location.append([x, y])
        
        if x<xmin:
          xmin = x 
        if x>xmax:
          xmax = x
        if y>ymax:
          ymax = y
        
        # Visualize
        color = randint(0, 255 + 1)
        output[mask != 0] = color
        cv2.rectangle(output2, (x, y), (x + w, y + h), color, 1)
        cv2.putText(output2, '%d' % i, (x + w // 4, y + h // 2), cv2.FONT_HERSHEY_SIMPLEX, 0.4, color, 1,
                    cv2.LINE_AA)

    angle = calc_angle([location[0][0],location[1][0]],[location[0][1],location[1][1]])
    return angle,xmin,xmax,ymax

def rotate_image(img,angle):
    # Rotate a given image.
    (h, w) = img.shape[:2]
    center = (w / 2, h / 2)

    M = cv2.getRotationMatrix2D(center, angle, 1.0)
    rotated = cv2.warpAffine(img, M, (w, h))
    #print("rotate {0}° right".format(angle))
    return rotated

def remove_yellow(img):
    # yellow in BRG mode
    yellow = np.uint8([[[0,255,255]]])
    #yellow in hsv
    hsv_yellow = cv2.cvtColor(yellow,cv2.COLOR_BGR2HSV)

    # Convert BGR image to HSV
    hsv = cv2.cvtColor(img, cv2.COLOR_BGR2HSV)

    # define range of yellow color in HSV
    lower_yellow = np.array([20,10,10])
    upper_yellow = np.array([40,255,255])

    # Threshold the HSV image to get only yellow colors
    mask = cv2.inRange(hsv, lower_yellow, upper_yellow)

    #background to put instead of yellow
    background = np.full(img.shape, 255, dtype=np.uint8)
    # biwise or is performed only in the region of mask, all other values will be set to black in the output
    bk = cv2.bitwise_or(background, background, mask=mask)

    # combine foreground+background
    res = cv2.bitwise_or(img, bk)
    return res


#global virables
h,w= 6843,4816
patch_size = 900
row_size = 240

def checkPatch(img):
    h,w= img.shape[0],img.shape[1]
    threshold = 800000

    orig = img.copy()
    #img = cv2.cvtColor(img,cv2.COLOR_BGR2GRAY)
    ret,img = cv2.threshold(img,240,255,cv2.THRESH_BINARY_INV)

    #Split to four quarters
    upLeft = img[0:h//2,0:w//2]
    upRight = img[0:h//2,w//2:]
    downLeft = img[h//2:,0:w//2]
    downRight = img[h//2:,w//2:]

    #claculate the sum of each quarter
    sumUpLeft = np.sum(upLeft)
    sumUpRight = np.sum(upRight)
    sumDownLeft = np.sum(downLeft)
    sumDownRight = np.sum(downRight)

    #check if bigger than the threshold
    boolUpLeft = threshold < sumUpLeft
    boolUpRight = threshold < sumUpRight
    boolDownLeft = threshold < sumDownLeft
    boolDownRight = threshold < sumDownRight

    #check if at least 3 quarters are bigger than thershold
    isValidPatch = checkQuarters(boolUpRight,boolUpLeft,boolDownLeft,boolDownRight)

    return isValidPatch

def checkQuarters(q1,q2,q3,q4):
    return (int(q1) + int(q2) + int(q3) + int(q4)) > 2

def boundText(im):
    gray = cv2.cvtColor(im, cv2.COLOR_BGR2GRAY)
    _,thresh=cv2.threshold(gray,210,255,cv2.THRESH_BINARY)
    thresh = 255-thresh

    contours, _  = cv2.findContours(thresh, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    newContours = []
    x1min = 1000
    y1min = 1000
    x2max = 0
    y2max = 0
    for cnt in contours:
        if cv2.contourArea(cnt) > 150:
            [x, y, w, h] = cv2.boundingRect(cnt)
            if x<x1min:
                x1min = x
            if y<y1min:
                y1min = y   
            if x+w>x2max:
                x2max = x+w
            if y+h>y2max:
                y2max = y+h
    return im[y1min:y2max,x1min:x2max]


def split_into_patches_random(img,num_of_patches,counter,patches):
    #set borders to the image
    ymax,xmax=img.shape[0],img.shape[1]
    #set the height and width of the patch size
    h,w=patch_size,patch_size
    #keep track of the number of patches created
    #number of rows in the document
    numOfRows = (img.shape[0] // row_size) + 1


    while(counter < num_of_patches):
        #radom start x point of patch
        x_startPatch = random.randrange(0,xmax - 900)

        #radom start y point of patch
        if(numOfRows - 4 > 0):
            randomRowNumber = (random.randrange(0,numOfRows - 3))
        else:
            randomRowNumber = 0
        
        y_startPatch = randomRowNumber * row_size
        #end x point
        x_endPatch = x_startPatch + patch_size
        #end y point
        y_endPatch = y_startPatch + patch_size

        patch = img[y_startPatch:y_endPatch,x_startPatch:x_endPatch]

        if(checkPatch(patch)):
            counter+= 1
            patches.append(patch)
    

          
def split_into_patches(img,num_of_patches):
    #set borders to the image
    ymax,xmax=img.shape[0],img.shape[1]
    #for the patch name
    counter=0
    #set the height and width of the patch size
    h,w=patch_size,patch_size
    #keep track of the patches that created
    x1,x2 = 0,w
    y1,y2 = 0,h
    patches = []
    while(counter < num_of_patches):
        if(x2>xmax):
            x1=0
            x2=w
            y1+=240
            y2+=240
        if(y2>ymax):
            break
        temp = img[y1:y2,x1:x2]
        if( (x2-x1)==900  and (y2-y1) == 900 and  checkPatch(temp)):
            patches.append(temp)
            counter+=1
        x1 += 500
        x2 += 500
    if counter < num_of_patches:
        split_into_patches_random(img,num_of_patches,counter,patches)
    return patches
    

    
def extractTextbox(img):
    # img = np.resize(img,(h,w,3))remove_yellow
    # img = np.array(img)
    # angle,xmin,xmax,ymax = find_squares2(img)

    # img = rotate_image(img,angle)
    
    img = remove_yellow(img)#cv2.cvtColor(np.array(img), cv2.COLOR_RGB2BGR))
    # img = np.array(img)
    # img = img[1900:ymax-100,xmin:xmax+100]
    
    img = boundText(img)  
    img = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    return img
    
def convert_document_to_patches(img):
        try:
            img = extractTextbox(img)
            return split_into_patches(img,15)
        except AttributeError:
            print('cannot find text box')

def preparePatchesToModel(patches):
    for i in range(len(patches)):
        patches[i] = np.array(patches[i], dtype = np.float32)    
        np.expand_dims(patches[i], axis=0)
        patches[i] = cv2.resize(patches[i], (150,150))
        patches[i]/=255
        # if(i==0):
        #     # plt.imshow(patches[i],cmap="gray")
        #     # plt.show()
       

def saveTextbox():
    document_name_list = os.listdir('./HandwrittenForms_paragraphs/')
    path_dir = './only_text_docs'
    if (os.path.isdir(path_dir)) != True:
        os.mkdir(path_dir)
    for doc_name in document_name_list:
        try:
            print(doc_name)
            img = extractTextbox(doc_name)
            cv2.imwrite(path_dir + "/" + doc_name,img)
        except:
            print('cannot find text box')
       


# In[3]:


##generateAugImages()


# In[4]:


def createWritersDir(path,dataset):
    if (os.path.isdir(path)) != True:
        os.mkdir(path)
    for group in dataset:
        if (os.path.isdir(path+"/"+str(group))) != True:
            os.mkdir(path+"/"+str(group))
        
def createDocumentsDir(train_set_groups,val_set_groups,dataset):
    for i in range(len(dataset[1])):
        print(dataset[1][i],dataset[0][i])
        if dataset[1][i] in train_set_groups:
            print("in train")
            path = './train_set/' + str(dataset[1][i]) + "/" + (dataset[0][i])[:len(dataset[0][i])-4]
            if (os.path.isdir(path)) != True:
                os.mkdir(path)
        elif dataset[1][i] in val_set_groups:
            print("in val")
            path = './val_set/' + str(dataset[1][i]) + "/" + (dataset[0][i])[:len(dataset[0][i])-4]
            if (os.path.isdir(path)) != True:
                os.mkdir(path)
        else:
            print("in test")
            path = './test_set/' + str(dataset[1][i]) + "/" + (dataset[0][i])[:len(dataset[0][i])-4]
            if (os.path.isdir(path)) != True:
                os.mkdir(path)
        img = cv2.imread('./only_text_docs/' + dataset[0][i],cv2.IMREAD_GRAYSCALE)
        img_name = (dataset[0][i])[:len(dataset[0][i])-4]
        split_into_patches(path,img,img_name,15)


# In[5]:


def createPairs():
    df = pd.read_excel('./excelFiles/writer-set-aug.xlsx',engine='openpyxl')
    temp = []
    for column_name, column in df.transpose().iterrows():
        temp.append(column)
    groups = list(temp[1])
    groups = set(groups)
    numOfWriters = len(groups)
    groups = list(groups)
    train_set,val_set,test_set = [],[],[]
    random.shuffle(groups)
    train_set = groups[:round(numOfWriters*0.80)]
    val_set = groups[round(numOfWriters*0.80):round(numOfWriters*0.90)]
    test_set = groups[round(numOfWriters*0.90):]
    print(len(train_set),len(val_set),len(test_set))
    createWritersDir('./train_set', train_set)
    createWritersDir('./val_set', val_set)
    createWritersDir('./test_set', test_set)
    temp[0] = list(temp[0])
    temp[1] = list(temp[1])
    createDocumentsDir(train_set,val_set,temp)  
##createPairs()


# In[7]:


def createExcelPairs(target,path):
    writers_list = os.listdir(path)
    right, left, label = [],[],[]
    for writer in writers_list:
        documents = os.listdir(path + "/" + writer)
        pairs = combinations(documents,2)
        pairs = list(pairs)
        limit = 30
        if len(pairs) > limit:
            random.shuffle(pairs)
            pairs = pairs[:limit]
        for doc1,doc2 in pairs:
            
#             doc1,doc2 = random.sample(documents,2)
            right.append(path + writer + "/" + doc1)
            left.append(path + writer + "/" + doc2)
            label.append(1)
    print(len(right))
    for i in range(len(right)):
        writer1,writer2 = random.sample(writers_list,2)
        documents1 = os.listdir(path + "/" + writer1)
        documents2 = os.listdir(path + "/" + writer2)
        doc1 = random.sample(documents1,1)
        doc2 = random.sample(documents2,1)
        right.append(path + writer1 + "/" + doc1[0])
        left.append(path + writer2 + "/" + doc2[0])
        label.append(0)
    
    df = pd.DataFrame({"Left":left, "Right":right, "Label":label})
    writer = ExcelWriter('./excelFiles/' + target +'_set.xlsx')
    df.to_excel(writer,'Sheet1',index=False)
    writer.save()   
##    
##createExcelPairs("Train_ext",'./train_set/')
##createExcelPairs("Val_ext",'./val_set/')
##createExcelPairs("Test_ext",'./test_set/')


# In[ ]:




