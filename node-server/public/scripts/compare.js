
  let count = 0;
  let id_count=0;
  let resize;
      var el = document.getElementById('crop-image');
      resize = new Croppie(el, {
          viewport: { width: 200, height: 100 },
          boundary: { width: 450, height: 550 },
          showZoomer: false,
          enableResize: true,
          enableOrientation: true,
          mouseWheelZoom: 'ctrl'
      });

  var boundaryDiv = document.getElementsByClassName('cr-boundary')[0];
      boundaryDiv.style.maxWidth = "450px";
      boundaryDiv.style.maxHeight = "550px";

  var cropDiv = document.getElementById('crop');
  // crop button
  var cropButton = document.createElement('button');
  cropButton.classList.add("btn", "btn-success");
  cropButton.innerHTML = "Crop & Add";
  cropButton.style.float = "left";

  // cancel button
  var cancelButton = document.createElement('button');
  cancelButton.classList.add("btn", "btn-danger");
  cancelButton.innerHTML = "Cancel";
  cancelButton.style.float = "right";

  cropDiv.appendChild(cropButton);
  cropDiv.appendChild(cancelButton);


    function getDocuments(){
      var target = document.getElementById("targetImg");
      var chosenDocs = document.getElementsByClassName("chose-img");
      console.log(target,chosenDocs);
      if(target == null || chosenDocs.length == 0){
        alert("You have to choose target document and at least on more document to compare.");
        return;
      }
      document.getElementById("loading").style.display = "block";
      var targetDoc = {name: document.getElementById("targetImg").name, id: document.getElementById("targetImg").dataset.id,
      points:document.getElementById("targetImg").dataset.points};
      var compareDocs = [];
      const selectedModel = document.getElementsByName("selectedModel")[0].value;
      for(var i=0; i<chosenDocs.length; i++){
        compareDocs.push({name: chosenDocs[i].name, id: chosenDocs[i].dataset.id, points:chosenDocs[i].dataset.points});
      }
      console.log(compareDocs);
      var xhr = new XMLHttpRequest();
      xhr.open("POST", "/send-to-model", true);
      xhr.onreadystatechange = function () {
        // In local files, status is 0 upon success in Mozilla Firefox
        if(xhr.readyState === XMLHttpRequest.DONE) {
          var status = xhr.status;
          if (status === 0 || (status >= 200 && status < 400)) {
            // The request has been completed successfully
            showResultsInPage(xhr.responseText,targetDoc,compareDocs);
          }
        }
      }
      xhr.setRequestHeader('Content-Type', "application/json;charset=UTF-8");
      xhr.send(JSON.stringify({

        target: targetDoc,
        compare: compareDocs,
        model: selectedModel
      }));
    }

    function showResultsInPage(result,target,compare){
      document.getElementById("loading").style.display = "none";
      document.getElementsByClassName("results-box")[0].style.display = "block";
      document.getElementsByClassName("footer")[0].style.position = "sticky";
      document.getElementById("resultTargetDocumentName").innerHTML = "Target Document Selected: " + "&emsp;" + "<b>"+target.name+"</b>";
      document.getElementById("resultModelName").innerHTML = "Model: " + "&emsp;" + document.getElementById("selectModel").value;

      var table = document.getElementById("table-body");
      while (table.firstChild) {
        table.removeChild(table.lastChild);
      }
      var row,head,precent,doc_name,doc_precent,model_asses;
      result = JSON.parse(result);
      console.log(result);
      for(var i=0; i<compare.length; i++){
        row = document.createElement("tr");
        head = document.createElement("th");
        head.scope = "row";
        head.innerHTML = i+1;
        doc_name = document.createElement("td");
        doc_name.innerHTML = compare[i].name;
        doc_precent = document.createElement("td");
        precent = result[i]*100;
        console.log(precent);
        doc_precent.innerHTML = String(precent) + "%";
        model_asses = document.createElement("td");
        if(precent < 50){
          row.classList.add("table-danger");
          model_asses.innerHTML = "Not Same Writer";
        }else if(precent >= 50 && precent < 75){
          row.classList.add("table-warning");
          model_asses.innerHTML = "Could Be The Same Writer";
        }else if(precent >= 75){
          row.classList.add("table-success");
          model_asses.innerHTML = "Same Writer";
        }
        row.appendChild(head);
        row.appendChild(doc_name);
        row.appendChild(doc_precent);
        row.appendChild(model_asses);
        table.appendChild(row);
        document.getElementsByClassName("body")[0].style.height = "max-content";
      }
    }
    function closeCropWindow(){
      document.getElementById('crop').style.display = "none";
    }


    function cropImage_trg(){
      var el = document.getElementById('crop-image');
      var doc = document.getElementById("targetDoc");

      el.src = doc.options[doc.selectedIndex].value;
      resize.bind({
          url: el.src,
      });

        var cropDiv = document.getElementById('crop');
        cropDiv.style.display = "block";


      cropButton.onclick = async()=>{
        var olditemsDiv= document.getElementById("itemsDiv")
        if(olditemsDiv!=undefined){
          olditemsDiv.remove();
        }

        var targetImg = document.createElement("img");
        var itemsDiv = document.createElement("div");
        var infoDiv = document.createElement("div");

        var points = (resize.get()).points;
        var width = parseInt(points[2]) - parseInt(points[0]);
        var height = parseInt(points[3]) - parseInt(points[1]);

        var buttonView = document.createElement("button");
        var buttonRemove = document.createElement("button");
        var node;

        infoDiv.classList.add("infoDiv");
        infoDiv.classList.add("infoDivtarget")
        targetImg.classList.add("target-img");
        targetImg.id = "targetImg";
        itemsDiv.id = "itemsDiv";
        targetImg.src = await resize.result("canvas",{width,height},"png",1,false);
        targetImg.name = doc.options[doc.selectedIndex].dataset.name;
        targetImg.dataset.id = doc.options[doc.selectedIndex].dataset.id;
        targetImg.dataset.points = points;
        node = document.createTextNode(targetImg.name);
        docTitle = document.createElement("h5");
        docTitle.appendChild(node);


        infoDiv.appendChild(docTitle);

        buttonView.innerHTML = "View&emsp;" + '<i class="fas fa-expand"></i>';
        buttonView.classList.add("btn", "btn-primary" ,"document-button");
        buttonView.onclick = ()=>{
          targetImg = document.getElementById("targetImg");
          openWindow(targetImg);
        }
        buttonView.id = targetImg.dataset.id;

        buttonRemove.innerHTML = "Remove&emsp;" + '<i class="fas fa-trash-alt"></i>';
        buttonRemove.classList.add("btn", "btn-danger" ,"document-button");
        buttonRemove.id = targetImg.dataset.id;
        buttonRemove.onclick =()=>{
          itemsDiv.remove();
          document.getElementById("zero-message-target").style.display = "block";
          document.getElementById("chosen-doc").style.display = "none";
        }
        infoDiv.appendChild(docTitle);
        infoDiv.appendChild(buttonView);
        infoDiv.appendChild(buttonRemove);
        itemsDiv.appendChild(targetImg);
        itemsDiv.appendChild(infoDiv);

        document.getElementById("chosen-doc").appendChild(itemsDiv);


        document.getElementById("zero-message-target").style.display = "none";
        document.getElementById("chosen-doc").style.display = "block";
        closeCropWindow();
        };
        cancelButton.onclick = ()=>{
        closeCropWindow();
      };



    }



    function cropImage_cmpr(){
      var el = document.getElementById('crop-image');
      var doc = document.getElementById("compareDoc");

      el.src = doc.options[doc.selectedIndex].value;
      resize.bind({
          url: el.src,
      });
      cropButton.onclick= async()=>{
        document.getElementById("zero-message").style.display = "none";
        document.getElementById("carouselExampleDark").style.display = "block";
        var doc = document.getElementById("compareDoc");
        var itemDiv = document.createElement("div");
        itemDiv.classList.add("carousel-item","carousel-doc");
        itemDiv.id = id_count;
        if(count == 0){
          itemDiv.classList.add("active");
        }
        var img = document.createElement("img");
        img.classList.add("chose-img");
        var points = (resize.get()).points;
        var width = parseInt(points[2]) - parseInt(points[0]);
        var height = parseInt(points[3]) - parseInt(points[1]);
        img.src = await resize.result("canvas",{width,height},"png",1,false);
        img.name = doc.options[doc.selectedIndex].dataset.name;
        img.dataset.id = doc.options[doc.selectedIndex].dataset.id;
        img.dataset.points = points;
        img.id = id_count;

        itemDiv.appendChild(img);
        var infoDiv = document.createElement("div");
        infoDiv.classList.add("infoDiv");

        docTitle = document.createElement("h5");
        var node = document.createTextNode(img.name);
        docTitle.appendChild(node);
        infoDiv.appendChild(docTitle);
        var buttonsDiv = document.createElement("div");
        var buttonView = document.createElement("button");
        buttonView.innerHTML = "View&emsp;" + '<i class="fas fa-expand"></i>';
        buttonView.classList.add("btn", "btn-primary" ,"document-button");
        buttonView.onclick = openDocumentInNewWindow;
        buttonView.id = id_count;
        var buttonRemove = document.createElement("button");
        buttonRemove.innerHTML = "Remove&emsp;" + '<i class="fas fa-trash-alt"></i>';
        buttonRemove.classList.add("btn", "btn-danger" ,"document-button");
        buttonRemove.id = id_count;
        buttonRemove.onclick = removeSelectedDocument;
        infoDiv.appendChild(docTitle);
        infoDiv.appendChild(buttonView);
        infoDiv.appendChild(buttonRemove);
        itemDiv.appendChild(infoDiv);
        var items = document.getElementById("items");
        items.appendChild(itemDiv);
        id_count++;
        count++;
        var counter = document.getElementById("count").innerHTML = "Total: " + String(count);
        closeCropWindow();
      }
      cancelButton.onclick= ()=>{
        closeCropWindow();
      }
      var cropDiv = document.getElementById('crop');
      cropDiv.style.display = "block";
    }


    function openDocumentInNewWindow(e){
      var docID = this.id;
      var allDocs = document.getElementsByClassName("chose-img");
      var documentToView;
      for(var i=0; i<allDocs.length; i++){
        if (allDocs[i].id === docID){
            documentToView = allDocs[i];
        }
      }
      if(documentToView){
        openWindow(documentToView);
      }
    }

    function openWindow(documentToView){
      var docW = documentToView.width * 1.5;
      var docH = documentToView.height * 1.5;
      var docWindow = window.open("", "Document", "width=" + docW + ",height=" + docH);
      docWindow.document.write("<img width=" + docW + " height=" + docH + " src="+documentToView.src+">");
    }

    function findItem(items,itemid){
      var item;
      for(var i=0; i<items.length; i++){
        if (items[i].id === itemid){
            item = items[i];
        }
      }
      return item;
    }

    function getItemIndexToActive(items,itemToDelete){
      var index;
      for(var i=0; i<items.length; i++){
        if (items[i] != itemToDelete){
            index = i;
            break;
        }
      }
      return index;
    }

    function removeSelectedDocument(){
      var docID = this.id;
      var documentToDelete;
      var arr = [];
      var index;
      allDocs = document.getElementsByClassName("carousel-doc");
      for(var i=0; i<allDocs.length; i++){
        arr.push(allDocs[i])
        if (allDocs[i].id === docID){
            documentToDelete = allDocs[i];
            index=i;
        }
      }
      arr.splice(index,1)
      documentToDelete.classList.remove("active")
        if(arr.length>0){
          arr[0].classList.add("active");
        }
        documentToDelete.remove();


      // if(documentToDelete){
      //   if(count > 1){
      //     for(var i=0; i<allDocs.length; i++){
      //       if (allDocs[i] != documentToDelete){
      //         allDocs[i].classList.add("active");
      //         break;

      //       }
      //     }
      //   }

        // if(count>1){
        //   allDocs = document.getElementsByClassName("carousel-doc");
        //   console.log(allDocs[0]);
        //   allDocs[0].classList.add("active");
        // }
        count--;
        var counter = document.getElementById("count").innerHTML = "Total: " + String(count);
        if(count == 0){
          document.getElementById("zero-message").style.display = "block";
          document.getElementById("carouselExampleDark").style.display = "none";
        }



}
