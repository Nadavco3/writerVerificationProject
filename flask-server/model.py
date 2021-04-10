#!/usr/bin/env python
# coding: utf-8

# In[1]:


get_ipython().run_line_magic('matplotlib', 'inline')
from keras.models import Sequential
from keras.layers import Conv2D, ZeroPadding2D, Activation, Input, concatenate
from keras.models import Model
from keras.layers.normalization import BatchNormalization
from keras.layers.pooling import MaxPooling2D, AveragePooling2D
from keras.layers.merge import Concatenate
from keras.layers.core import Lambda, Flatten, Dense, Dropout
from keras.preprocessing import image
from keras.utils import to_categorical
from keras import initializers
from keras.engine.topology import Layer
from keras.optimizers import Adam
from keras import backend as K
from keras.models import Model
import itertools
import math
import random
import keras
import cv2
import os
from PIL import Image
from random import randint
import numpy as np
import pandas as pd
import PIL
import tensorflow as tf
import matplotlib.pyplot as plt
from sklearn.metrics import confusion_matrix


# In[2]:


def plot_confusion_matrix(cm, classes,
                        normalize=False,
                        title='Confusion matrix',
                        cmap=plt.cm.Blues):
    """
    This function prints and plots the confusion matrix.
    Normalization can be applied by setting `normalize=True`.
    """
    plt.imshow(cm, interpolation='nearest', cmap=cmap)
    plt.title(title)
    plt.colorbar()
    tick_marks = np.arange(len(classes))
    plt.xticks(tick_marks, classes, rotation=45)
    plt.yticks(tick_marks, classes)

    if normalize:
        cm = cm.astype('float') / cm.sum(axis=1)[:, np.newaxis]
        print("Normalized confusion matrix")
    else:
        print('Confusion matrix, without normalization')

    print(cm)

    thresh = cm.max() / 2.
    for i, j in itertools.product(range(cm.shape[0]), range(cm.shape[1])):
        plt.text(j, i, cm[i, j],
            horizontalalignment="center",
            color="black" if cm[i, j] < thresh else "white")

    plt.tight_layout()
    plt.ylabel('True label')
    plt.xlabel('Predicted label')


# In[3]:


def loadToArr(dir_path,numOfPatch,loadType):
    img_w, img_h = 150,150
    patch_list = os.listdir(dir_path)
    data = []
    for i in range(numOfPatch):
        input1 = cv2.resize(cv2.imread(dir_path + '/' + patch_list[i],cv2.IMREAD_GRAYSCALE), (img_w, img_h))
        input1 = input1.reshape(input1.shape[0],input1.shape[1],1)
        input1 = np.array(input1, dtype = np.float32)
        input1/=255
        data.append(input1)
    if(loadType == 'train'):
        return data
    elif(loadType == 'testPatch'):
        random.shuffle(data)
        return data
    elif loadType == 'testDoc':
        random.shuffle(data)
        return [data]

def LoadPatchPairs(left,right,label,numOfPatch,loadType):
    train1,train2,labels = [],[],[]
    for i in range(len(left)):
        train1 += loadToArr(left[i],numOfPatch,loadType)
        train2 += loadToArr(right[i],numOfPatch,loadType)
        if(loadType == 'train') or (loadType == 'testPatch'):
            labels += [label[i]]*numOfPatch
        elif(loadType == 'testDoc'):
            labels += [label[i]]
    return train1,train2,labels


def imageLoader(left,right,label,batch_size): 
    L = len(left)
    
    #this line is just to make the generator infinite, keras needs that    
    while True:

        batch_start = 0
        batch_end = batch_size

        while batch_start < L:
            limit = min(batch_end, L)
            x1,x2,y = LoadPatchPairs(left[batch_start:limit],right[batch_start:limit],label[batch_start:limit],15,'train')
           
            X1 = np.array(x1)
            X2 = np.array(x2)
            Y  = np.array(y)
            Y  = Y.reshape(-1,1)
            

            yield ([X1,X2],Y) #a tuple with two numpy arrays with batch_size samples     

            batch_start += batch_size   
            batch_end += batch_size
            
def loadFiles(excelPath):
    df = pd.read_excel(excelPath,engine='openpyxl')
    temp = []
    for column_name, column in df.transpose().iterrows():
        temp.append(column)

    left = list(temp[0])
    right = list(temp[1])
    label = list(temp[2])

    
    return left,right,label
                                   
def loadData(excelPath,numOfPatch,loadType):
    
    left,right,label = loadFiles(excelPath)
    test1,test2,labels = LoadPatchPairs(left,right,label,numOfPatch,loadType)

    X1 = np.array(test1)
    del test1
    X2 = np.array(test2)
    del test2
    Y  = np.array(labels)
    del labels
    Y  = Y.reshape(-1,1)

    per=np.random.permutation(len(X1))
    X1 = np.array([X1[i] for i in per])
    X2 = np.array([X2[i] for i in per])
    Y  = np.array([Y[i] for i in per])
    return X1,X2,Y


# In[5]:


#model BGU
def base_network(input_dim):
    inputs = Input(shape=input_dim)
    conv_1=Conv2D(64,(5,5),padding="same",activation='relu',name='conv_1')(inputs)
    conv_1=MaxPooling2D(pool_size=(2, 2))(conv_1)
    conv_2=Conv2D(128,(5,5),padding="same",activation='relu',name='conv_2')(conv_1)
    conv_2=MaxPooling2D(pool_size=(2, 2))(conv_2)
    conv_3=Conv2D(256,(3,3),padding="same",activation='relu',name='conv_3')(conv_2)
    conv_3=MaxPooling2D(pool_size=(2, 2))(conv_3)    
    conv_4=Conv2D(512,(3,3),padding="same",activation='relu',name='conv_4')(conv_3)
    conv_5=Conv2D(512,(3,3),padding="same",activation='relu',name='conv_5')(conv_4)
    conv_5=MaxPooling2D(pool_size=(2, 2))(conv_5)

    dense_1=Flatten()(conv_5)
    dense_1=Dense(512,activation="relu")(dense_1)
    dense_1=Dropout(0.3)(dense_1)
    dense_2=Dense(512,activation="relu")(dense_1)
    dense_2=Dropout(0.5)(dense_2)
    return Model(inputs, dense_2)


input_shape=(150,150,1)
learning_rate=0.00001
base_network = base_network(input_shape)
input_a = Input(shape=input_shape)
input_b = Input(shape=input_shape)
processed_a = base_network(input_a)
processed_b = base_network(input_b)

fc6=concatenate([processed_a, processed_b])

fc7 = Dense(4096, activation = 'relu')(fc6)
fc7 = Dropout(0.7)(fc7)
fc8 = Dense(4096, activation = 'relu')(fc7)
fc8 = Dropout(0.8)(fc8)

fc9=Dense(1, activation='sigmoid')(fc8)
model = Model([input_a, input_b], fc9)
#model.summary()

#training
adam=Adam(lr=learning_rate)
loss_fn = keras.losses.BinaryCrossentropy(from_logits=True)


# In[7]:


model.compile(loss='binary_crossentropy', optimizer=adam, metrics=tf.keras.metrics.BinaryAccuracy( name="binary_accuracy", dtype=None, threshold=0.75))
# H = model.fit(imageLoader(left,right,label,5),steps_per_epoch=len(left) // 5,epochs=100)


# In[8]:


left,right,label =loadFiles('./excelFiles/Train_ext_set.xlsx')
left_val,right_val,label_val = loadFiles('./excelFiles/Val_ext_set.xlsx')

per=np.random.permutation(len(left))
left = [left[i] for i in per]
right = [right[i] for i in per]
label  = [label[i] for i in per]


# In[9]:


# print(X1.shape,X2.shape,Y.shape)
model.fit(imageLoader(left,right,label,15),epochs=100,steps_per_epoch=len(left)//15,
          validation_data=imageLoader(left_val,right_val,label_val,5),validation_steps=len(left_val)//5)


# In[10]:


model.save('modelGoodResults3-0.75.h5')


# In[4]:


model = keras.models.load_model('./modelGoodResults3-0.75.h5')


# In[10]:


X1_test,X2_test,Y_test = loadData('./excelFiles/Test_ext_set.xlsx',15,'testDoc')


# In[7]:


len(X1_test),len(X2_test),len(Y_test)


# In[8]:


model.evaluate([X1_test,X2_test],Y_test)


# In[9]:


pred = model.predict([X1_test,X2_test])
pred = pred > 0.75
cm = confusion_matrix(Y_test, pred)

cm_plot_labels = ['not_same_writer','same_writer']
plot_confusion_matrix(cm=cm, classes=cm_plot_labels, title='Confusion Matrix')


# In[13]:


label=[]
for i in range(len(X1_test)):
    results = model.predict([X1_test[i],X2_test[i]]) > 0.80
    finalResult = np.sum(results) > 7 
    label.append(finalResult)


# In[14]:


cm = confusion_matrix(Y_test, label)

cm_plot_labels = ['not_same_writer','same_writer']
plot_confusion_matrix(cm=cm, classes=cm_plot_labels, title='Confusion Matrix')


# In[ ]:




