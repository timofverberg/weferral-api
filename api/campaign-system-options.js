let CampaignSystemOption = require('../models/campaign-sys-option');
let Campaign = require("../models/campaign");
let cloudinary = require('../config/cloudinary');
let File = require('../models/file');
let path = require("path");
let multer = require("multer");
let upload = multer({dest: 'images/'});
let auth = require("./middlewares/auth");
//let systemFilePath = "uploads/system-options";

let systemFiles = ['front_page_image', 'brand_logo'];

module.exports = function(router) {

    router.post('/system-options/file/:id', auth(), upload.single('file'), function (req, res, next){
        if (systemFiles.indexOf(req.params.id) > -1) {
            let campaign_id = req.params.id;
            cloudinary.uploader.upload(req.file.path).then((result) => {
                let newFile = new File({
                    'campaign_id': campaign_id,
                    'name': req.body.name,
                    'url': result.secure_url,
                    'public_id': result.public_id
                })

                newFile.create(function (created_file) {
                    if (created_file.data) {
                        res.json(created_file.map(entity => entity.data));
                    }
                })
            })
        }
    });

    router.get('/system-options/file/:id', auth(), function (req, res, next){
        if (systemFiles.indexOf(req.params.id) > -1) {
            File.findOne('name', req.params.id, function (image) {
                if (image.data) {
                    let fileUrl = image.data.url;
                    let options = {
                        headers: {
                            'Content-Disposition': "inline; filename=" + file.get("name")
                        }
                    };

                    res.sendFile(fileUrl, options);
                } else {
                    //todo: make less hardcoded.. maybe seperate api calls again
                    if(req.params.id == "brand_logo"){
                        return res.sendFile(path.resolve(__dirname, "../public/assets/logo-primary.svg"));
                    }
                    else {
                        res.status("400").send("no image");
                    }
                }
            });
        }
        else {
            res.status("400").send("not a valid system file option");
        }
    });

    router.get('/secret-key', function(req, res, next){
        let secretKey = process.env.SECRET_KEY;
        res.json(secretKey);
    });

    router.get('/system-options/file/:id', auth(), function (req, res, next){
        let campaign_id = req.params.id;
        File.findAll("campaign_id", campaign_id, function (results) {
            res.json(results.map(entity => entity.data));
        })
    })

    router.get(`/campaign-system-options/:campaignId`, function (req, res, next) {
        let campaignId = req.params.campaignId;
        CampaignSystemOption.findAll("campaign_id", campaignId, function (results) {
            res.json(results.reduce((acc, entity) => {
                acc[entity.data.option] = entity.data;
                return acc;
            }, {}));
        });
    });

    router.get('/system-setting/:campaignName', function (req, res, next) {
        let campaignName = req.params.campaignName.replace(/-/g, ' ');
        let campaignId = 0;
        Campaign.findOne("name", campaignName, function (campaigns) {
            if (campaigns.data) {
                campaignId = campaigns.data.id;

                CampaignSystemOption.findAll("campaign_id", campaignId, function (results) {
                    res.json(results.reduce((acc, entity) => {
                        acc[entity.data.option] = entity.data;
                        return acc;
                    }, {}));
                });
            }
        });

        
    })

    router.put('/system-settings/:campaignId', auth(), function (req, res, next) {
        let campaignId = req.params.campaignId;
        let updateData = req.body;
        CampaignSystemOption.findAll("campaign_id", campaignId, function (options) {
            let filteredUpdates = updateData.filter((option) => {
                return options.some((publicOption) => option.option == publicOption.get("option"));
            })

            CampaignSystemOption.batchUpdate(filteredUpdates, function (result) {
                let updated = result.reduce((settings, setting)=>{
                    console.log(setting);
                    settings[setting[0].option] = setting[0].value;
                    return settings;
                }, {});
                //dispatchEvent("system_options_updated", updated);
                //EventLogs.logEvent(req.user.get('id'), `system-options were updated by user ${req.user.get('email')}`);
                res.status(200).json(result);
            })
        });
    });

    require("./entity")(router, CampaignSystemOption, "campaign-system-options");
};