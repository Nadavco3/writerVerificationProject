from io import BytesIO
import ast
import os


def test_getmodels(app, client):
    f = open(app.instance_path + '/' + 'models' + '/' + "607ee73f9f3e5f1b440b2ea3/test1.h5", "a")
    f.write("Test file!")
    f.close()
    res = client.post('/get-user-models',data=dict(id="607ee73f9f3e5f1b440b2ea3"))
    get_models = ast.literal_eval(res.data.decode("utf-8").split('\n')[0])
    expected = ["test1.h5","test_not_deleted.h5"]
    not_expected = ["test1.h5","test1.h5" ]
    assert expected == get_models
    assert len(expected) != 0
    assert not_expected != get_models
    os.remove(app.instance_path + '/' + 'models' + '/' + "607ee73f9f3e5f1b440b2ea3/test1.h5")

def test_deleteModel(app, client):
    f = open(app.instance_path + '/' + 'models' + '/' + "607ee73f9f3e5f1b440b2ea3/test2.h5", "a")
    f.write("Test file!")
    f.close()
    res = client.post('/delete-model',data={"id":"607ee73f9f3e5f1b440b2ea3","modelName":"test2.h5"})
    models_names = os.listdir(app.instance_path + '/' + 'models' + '/' + "607ee73f9f3e5f1b440b2ea3/")
    models_names_return = ast.literal_eval(res.data.decode("utf-8").split('\n')[0])
    expected = ["test_not_deleted.h5"]
    assert expected==models_names
    assert expected==models_names_return

def test_deleteModel_dirnotexsit(app, client):
    res = client.post('/delete-model',data={"id":"notexsituser","modelName":"test2.h5"})
    expected = 'Error'
    assert expected == res.data.decode("utf-8")

def test_upload(app, client):
    res = client.post('/upload',data={"id":"607ee73f9f3e5f1b440b2ea3", "model":(BytesIO(b'Test file'), "test3.h5")})
    models_names = os.listdir(app.instance_path + '/' + 'models' + '/' + "607ee73f9f3e5f1b440b2ea3/")
    print(models_names)
    expected = "Uploaded to flask succesfully"
    assert expected == res.data.decode("utf-8")
    assert models_names == ["test3.h5","test_not_deleted.h5"]
    os.remove(app.instance_path + '/' + 'models' + '/' + "607ee73f9f3e5f1b440b2ea3/test3.h5")

def test_deleteUserModels(app, client):
    os.mkdir(app.instance_path + '/' + 'models' + '/' + "TestDir")
    f = open(app.instance_path + '/' + 'models' + '/' + "TestDir/test.h5", "a")
    f.write("Test file!")
    f.close()
    res = client.post('/delete-user-models',data={"id":"TestDir"})
    dir_names = os.listdir(app.instance_path + '/' + 'models' + '/')
    returns = res.data.decode("utf-8")
    expected = "Succefully deleted"
    assert expected==returns
    assert os.path.isdir(app.instance_path + '/' + 'models' + '/' + "TestDir") == False

def test_deleteUserModels_dirnotexsit(app, client):
    res = client.post('/delete-user-models',data={"id":"TestDir"})
    expected = 'Error'
    assert expected == res.data.decode("utf-8")

def test_Compare(app, client):
    res = client.post('/flask',data={"id":"607ee73f9f3e5f1b440b2ea3","model":"Default-model" ,"targetDoc":(open('tests/Document2.png', "rb"), "test-img.png"),
    "targetPoints":'277,1863,4389,4347',"compareDocs":[(open('tests/Document2.png', "rb"), "test-img.png")],"comparePoints":["277,1863,4389,4347"]
    })
    expected = [1.0]
    assert expected == ast.literal_eval(res.data.decode("utf-8").split('\n')[0])
